-- Final replacement after both the trial-events migration and the
-- group-schedule self-conflict hotfix. It preserves attached trial sessions
-- during a rebuild while continuing to ignore the group's own occurrence at
-- the exact generated start time.

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
  protected_session_id uuid;
  deleted_count integer := 0;
  created_count integer := 0;
  rules_count integer := 0;
  affected_count integer := 0;
begin
  select * into target_group
  from public.groups
  where id = p_group_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'Group not found'; end if;
  if jsonb_typeof(coalesce(p_rules, '[]'::jsonb)) <> 'array' then
    raise exception 'Rules must be an array';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_rules, '[]'::jsonb))
      as r(weekday int, starts_at time, ends_at time)
    where weekday not between 1 and 7
      or starts_at is null
      or ends_at is null
      or ends_at <= starts_at
  ) then
    raise exception 'Invalid schedule rule';
  end if;

  if (
    select count(*)
    from jsonb_to_recordset(coalesce(p_rules, '[]'::jsonb))
      as r(weekday int, starts_at time, ends_at time)
  ) <> (
    select count(distinct (weekday, starts_at, ends_at))
    from jsonb_to_recordset(coalesce(p_rules, '[]'::jsonb))
      as r(weekday int, starts_at time, ends_at time)
  ) then
    raise exception 'Duplicate schedule rule';
  end if;

  generation_from := greatest(current_date, coalesce(target_group.starts_on, current_date));
  generation_to := least(current_date + 84, coalesce(target_group.ends_on, current_date + 84));

  if p_rebuild_future then
    update public.lesson_sessions session
    set schedule_rule_id = null
    where session.organization_id = p_organization_id
      and session.group_id = p_group_id
      and session.starts_at >= now()
      and session.status = 'planned'
      and session.session_kind = 'regular'
      and session.schedule_rule_id is not null
      and session.rescheduled_from_session_id is null
      and exists (
        select 1
        from public.trial_events event
        where event.organization_id = p_organization_id
          and event.mode = 'attached_session'
          and event.lesson_session_id = session.id
      );

    delete from public.lesson_sessions session
    where session.organization_id = p_organization_id
      and session.group_id = p_group_id
      and session.starts_at >= now()
      and session.status = 'planned'
      and session.session_kind = 'regular'
      and session.schedule_rule_id is not null
      and session.rescheduled_from_session_id is null;
    get diagnostics deleted_count = row_count;
  end if;

  delete from public.group_schedule_rules
  where organization_id = p_organization_id and group_id = p_group_id;

  for rule_item in
    select value from jsonb_array_elements(coalesce(p_rules, '[]'::jsonb))
  loop
    insert into public.group_schedule_rules (
      organization_id, group_id, weekday, starts_at, ends_at
    ) values (
      p_organization_id,
      p_group_id,
      (rule_item->>'weekday')::int,
      (rule_item->>'starts_at')::time,
      (rule_item->>'ends_at')::time
    ) returning id into rule_id;
    rules_count := rules_count + 1;

    if p_rebuild_future and generation_from <= generation_to then
      for occurrence_date in
        select day::date
        from generate_series(generation_from, generation_to, interval '1 day') day
        where extract(isodow from day)::int = (rule_item->>'weekday')::int
      loop
        occurrence_start :=
          (occurrence_date + (rule_item->>'starts_at')::time)
          at time zone 'Europe/Moscow';
        occurrence_end :=
          (occurrence_date + (rule_item->>'ends_at')::time)
          at time zone 'Europe/Moscow';
        protected_session_id := null;

        if occurrence_end > now() then
          select session.id into protected_session_id
          from public.lesson_sessions session
          where session.organization_id = p_organization_id
            and session.group_id = p_group_id
            and session.starts_at = occurrence_start
            and session.status = 'planned'
            and session.session_kind = 'regular'
            and session.schedule_rule_id is null
            and exists (
              select 1
              from public.trial_events event
              where event.organization_id = p_organization_id
                and event.mode = 'attached_session'
                and event.lesson_session_id = session.id
            )
          limit 1
          for update;

          if exists (
            select 1
            from public.lesson_sessions other
            where other.organization_id = p_organization_id
              and other.status in ('planned', 'live')
              and other.starts_at < occurrence_end
              and coalesce(other.ends_at, other.starts_at + interval '90 minutes') > occurrence_start
              and (protected_session_id is null or other.id <> protected_session_id)
              and (
                (
                  other.group_id = p_group_id
                  and other.starts_at <> occurrence_start
                )
                or (
                  other.group_id <> p_group_id
                  and (
                    (
                      target_group.teacher_id is not null
                      and other.teacher_id = target_group.teacher_id
                    )
                    or (
                      target_group.room_id is not null
                      and other.room_id = target_group.room_id
                    )
                  )
                )
              )
          ) then
            raise exception 'schedule_resource_conflict';
          end if;

          if protected_session_id is not null then
            update public.lesson_sessions
            set course_id = target_group.course_id,
                teacher_id = target_group.teacher_id,
                room_id = target_group.room_id,
                schedule_rule_id = rule_id,
                lesson_date = occurrence_date,
                ends_at = occurrence_end
            where id = protected_session_id;
          else
            insert into public.lesson_sessions (
              organization_id, group_id, course_id, teacher_id, room_id,
              schedule_rule_id, lesson_date, starts_at, ends_at, status,
              session_kind, notification_status
            ) values (
              p_organization_id, p_group_id, target_group.course_id,
              target_group.teacher_id, target_group.room_id, rule_id,
              occurrence_date, occurrence_start, occurrence_end, 'planned',
              'regular', 'not_required'
            ) on conflict (group_id, starts_at) do nothing;
            get diagnostics affected_count = row_count;
            created_count := created_count + affected_count;
          end if;
        end if;
      end loop;
    end if;
  end loop;

  return jsonb_build_object(
    'rules', rules_count,
    'deleted', deleted_count,
    'created', created_count
  );
end;
$$;

revoke all on function public.replace_group_schedule(uuid, uuid, jsonb, boolean)
from public, anon, authenticated;
grant execute on function public.replace_group_schedule(uuid, uuid, jsonb, boolean)
to service_role;
