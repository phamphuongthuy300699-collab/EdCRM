-- Add explicit teacher pay modes while preserving the legacy rate column for
-- rolling deploys and old integrations.
alter table public.teacher_pay_rules
  add column if not exists pay_mode text not null default 'per_attendee';
alter table public.teacher_pay_rules
  add column if not exists rate numeric(12,2) generated always as (rate_per_attendee) stored;
alter table public.teacher_payroll_entries
  add column if not exists pay_mode text not null default 'per_attendee';

alter table public.teacher_pay_rules
  add constraint teacher_pay_rules_mode_check check (pay_mode in ('per_attendee', 'per_lesson'));
alter table public.teacher_payroll_entries
  add constraint teacher_payroll_entries_mode_check check (pay_mode in ('per_attendee', 'per_lesson'));

-- The lesson-completion transaction already creates exactly one payroll row
-- only when a live lesson is completed. Resolve the effective rule at that
-- immutable snapshot boundary and override the legacy attendee calculation.
create or replace function public.snapshot_teacher_payroll_mode()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_mode text;
  selected_rate numeric(12,2);
begin
  select rule.pay_mode, rule.rate
    into selected_mode, selected_rate
  from public.teacher_pay_rules rule
  join public.lesson_sessions session on session.id = new.lesson_session_id
  where rule.organization_id = new.organization_id
    and rule.teacher_id = new.teacher_id
    and rule.effective_from <= session.lesson_date
  order by rule.effective_from desc
  limit 1;

  if selected_rate is not null then
    new.pay_mode := selected_mode;
    new.rate_snapshot := selected_rate;
    new.amount := case
      when selected_mode = 'per_lesson' then selected_rate
      else new.attendee_count * selected_rate
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists teacher_payroll_snapshot_mode on public.teacher_payroll_entries;
create trigger teacher_payroll_snapshot_mode
before insert on public.teacher_payroll_entries
for each row execute function public.snapshot_teacher_payroll_mode();

create or replace function public.set_teacher_pay_rate(
  p_organization_id uuid,
  p_teacher_id uuid,
  p_pay_mode text,
  p_effective_from date,
  p_rate numeric,
  p_actor_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
begin
  if p_pay_mode not in ('per_attendee', 'per_lesson') then raise exception 'teacher_pay_mode_invalid'; end if;
  if p_rate < 0 then raise exception 'teacher_rate_negative'; end if;
  if not exists (
    select 1 from public.org_memberships
    where organization_id = p_organization_id and user_id = p_teacher_id
      and role = 'teacher' and is_active = true
  ) then raise exception 'teacher_not_found'; end if;

  insert into public.teacher_pay_rules (
    organization_id, teacher_id, effective_from, pay_mode, rate_per_attendee, created_by
  ) values (
    p_organization_id, p_teacher_id, p_effective_from, p_pay_mode, p_rate, p_actor_id
  )
  on conflict (organization_id, teacher_id, effective_from) do update set
    pay_mode = excluded.pay_mode,
    rate_per_attendee = excluded.rate_per_attendee,
    created_by = excluded.created_by
  returning id into saved_id;

  -- Historical snapshots are immutable. The only exception is the existing
  -- missing-rate repair path for unresolved, still-accrued entries.
  update public.teacher_payroll_entries payroll
  set pay_mode = p_pay_mode,
      rate_snapshot = p_rate,
      amount = case when p_pay_mode = 'per_lesson' then p_rate else payroll.attendee_count * p_rate end
  from public.lesson_sessions session
  where payroll.organization_id = p_organization_id
    and payroll.teacher_id = p_teacher_id
    and payroll.status = 'accrued'
    and payroll.lesson_session_id = session.id
    and session.lesson_date >= p_effective_from
    and exists (
      select 1 from public.finance_warnings warning
      where warning.organization_id = p_organization_id
        and warning.lesson_session_id = payroll.lesson_session_id
        and warning.warning_type = 'missing_teacher_rate'
        and warning.resolved_at is null
    );

  update public.finance_warnings warning
  set resolved_at = now()
  where warning.organization_id = p_organization_id
    and warning.teacher_id = p_teacher_id
    and warning.warning_type = 'missing_teacher_rate'
    and warning.resolved_at is null
    and exists (
      select 1
      from public.teacher_payroll_entries payroll
      join public.lesson_sessions session on session.id = payroll.lesson_session_id
      where payroll.organization_id = p_organization_id
        and payroll.lesson_session_id = warning.lesson_session_id
        and payroll.teacher_id = p_teacher_id
        and payroll.status = 'accrued'
        and payroll.pay_mode = p_pay_mode
        and payroll.rate_snapshot = p_rate
        and session.lesson_date >= p_effective_from
    );
  return saved_id;
end;
$$;

revoke all on function public.set_teacher_pay_rate(uuid, uuid, text, date, numeric, uuid) from public, anon, authenticated;
grant execute on function public.set_teacher_pay_rate(uuid, uuid, text, date, numeric, uuid) to service_role;

-- Compatibility wrapper for callers deployed before pay_mode existed.
create or replace function public.set_teacher_pay_rate(
  p_organization_id uuid,
  p_teacher_id uuid,
  p_effective_from date,
  p_rate numeric,
  p_actor_id uuid
) returns uuid
language sql
security definer
set search_path = public
as $$
  select public.set_teacher_pay_rate(
    p_organization_id, p_teacher_id, 'per_attendee', p_effective_from, p_rate, p_actor_id
  );
$$;

revoke all on function public.set_teacher_pay_rate(uuid, uuid, date, numeric, uuid) from public, anon, authenticated;
grant execute on function public.set_teacher_pay_rate(uuid, uuid, date, numeric, uuid) to service_role;

-- Keep generated recurring sessions inside the group's active dates. Rebuilds
-- continue to delete only safe future rule-owned regular sessions.
create or replace function public.replace_group_schedule(
  p_organization_id uuid,
  p_group_id uuid,
  p_rules jsonb,
  p_rebuild_future boolean default true
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_group public.groups%rowtype;
  rule_item jsonb;
  rule_id uuid;
  occurrence_date date;
  occurrence_start timestamptz;
  occurrence_end timestamptz;
  generation_from date;
  generation_to date;
  deleted_count integer := 0;
  created_count integer := 0;
  rules_count integer := 0;
  affected_count integer := 0;
begin
  select * into target_group from public.groups
  where id = p_group_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'Group not found'; end if;
  if jsonb_typeof(coalesce(p_rules, '[]'::jsonb)) <> 'array' then raise exception 'Rules must be an array'; end if;

  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_rules, '[]'::jsonb)) as r(weekday int, starts_at time, ends_at time)
    where weekday not between 1 and 7 or starts_at is null or ends_at is null or ends_at <= starts_at
  ) then raise exception 'Invalid schedule rule'; end if;

  if (select count(*) from jsonb_to_recordset(coalesce(p_rules, '[]'::jsonb)) as r(weekday int, starts_at time, ends_at time)) <>
     (select count(distinct (weekday, starts_at, ends_at)) from jsonb_to_recordset(coalesce(p_rules, '[]'::jsonb)) as r(weekday int, starts_at time, ends_at time))
  then raise exception 'Duplicate schedule rule'; end if;

  generation_from := greatest(current_date, coalesce(target_group.starts_on, current_date));
  generation_to := least(current_date + 84, coalesce(target_group.ends_on, current_date + 84));

  if p_rebuild_future then
    delete from public.lesson_sessions
    where organization_id = p_organization_id
      and group_id = p_group_id
      and starts_at >= now()
      and status = 'planned'
      and session_kind = 'regular'
      and schedule_rule_id is not null
      and rescheduled_from_session_id is null;
    get diagnostics deleted_count = row_count;
  end if;

  delete from public.group_schedule_rules
  where organization_id = p_organization_id and group_id = p_group_id;

  for rule_item in select value from jsonb_array_elements(coalesce(p_rules, '[]'::jsonb)) loop
    insert into public.group_schedule_rules (organization_id, group_id, weekday, starts_at, ends_at)
    values (p_organization_id, p_group_id, (rule_item->>'weekday')::int, (rule_item->>'starts_at')::time, (rule_item->>'ends_at')::time)
    returning id into rule_id;
    rules_count := rules_count + 1;

    if p_rebuild_future and generation_from <= generation_to then
      for occurrence_date in
        select day::date
        from generate_series(generation_from, generation_to, interval '1 day') day
        where extract(isodow from day)::int = (rule_item->>'weekday')::int
      loop
        occurrence_start := (occurrence_date + (rule_item->>'starts_at')::time) at time zone 'Europe/Moscow';
        occurrence_end := (occurrence_date + (rule_item->>'ends_at')::time) at time zone 'Europe/Moscow';
        if occurrence_end > now() and exists (
          select 1 from public.lesson_sessions other
          where other.organization_id = p_organization_id
            and other.status in ('planned', 'live')
            and other.starts_at < occurrence_end
            and coalesce(other.ends_at, other.starts_at + interval '90 minutes') > occurrence_start
            and (other.group_id = p_group_id
              or (target_group.teacher_id is not null and other.teacher_id = target_group.teacher_id)
              or (target_group.room_id is not null and other.room_id = target_group.room_id))
        ) then raise exception 'New schedule conflicts with another lesson on %', occurrence_date; end if;

        if occurrence_end > now() then
          insert into public.lesson_sessions (
            organization_id, group_id, course_id, teacher_id, room_id, schedule_rule_id,
            lesson_date, starts_at, ends_at, status, session_kind, notification_status
          ) values (
            p_organization_id, p_group_id, target_group.course_id, target_group.teacher_id, target_group.room_id, rule_id,
            occurrence_date, occurrence_start, occurrence_end, 'planned', 'regular', 'not_required'
          ) on conflict (group_id, starts_at) do nothing;
          get diagnostics affected_count = row_count;
          created_count := created_count + affected_count;
        end if;
      end loop;
    end if;
  end loop;

  return jsonb_build_object('rules', rules_count, 'deleted', deleted_count, 'created', created_count);
end;
$$;

revoke all on function public.replace_group_schedule(uuid, uuid, jsonb, boolean) from public;
grant execute on function public.replace_group_schedule(uuid, uuid, jsonb, boolean) to service_role;
