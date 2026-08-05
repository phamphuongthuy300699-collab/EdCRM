-- Atomically replace weekly rules and optionally rebuild only safe future lessons.
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

    if p_rebuild_future then
      for occurrence_date in
        select day::date from generate_series(current_date, current_date + interval '12 weeks' - interval '1 day', interval '1 day') day
        where extract(isodow from day)::int = (rule_item->>'weekday')::int
      loop
        occurrence_start := (occurrence_date + (rule_item->>'starts_at')::time) at time zone 'Europe/Moscow';
        occurrence_end := (occurrence_date + (rule_item->>'ends_at')::time) at time zone 'Europe/Moscow';
        if occurrence_end > now() and exists (
          select 1 from public.lesson_sessions other
          where other.organization_id = p_organization_id
            and other.status in ('planned', 'live')
            and other.starts_at < occurrence_end and coalesce(other.ends_at, other.starts_at + interval '90 minutes') > occurrence_start
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
