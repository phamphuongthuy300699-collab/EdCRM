-- Synchronize future generated lessons after group identity/date edits.
-- No production data backfill: legacy repairs are a separately audited operation.

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

  -- Do not delete valid future rows and report success with zero replacements
  -- when the operator cannot see a stale group end date.
  if p_rebuild_future and target_group.status = 'active'
    and jsonb_array_length(coalesce(p_rules, '[]'::jsonb)) > 0
    and target_group.ends_on < (now() at time zone 'Europe/Moscow')::date then
    raise exception 'group_schedule_expired';
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

-- A NULL schedule means the caller edited group attributes without touching the
-- weekly rules. An explicit [] remains the intentional clear-schedule command.
create or replace function public.save_group_with_schedule(
  p_organization_id uuid, p_group_id uuid, p_group jsonb, p_rules jsonb, p_rebuild_future boolean default true
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  target_group public.groups%rowtype; saved_group_id uuid; schedule_result jsonb;
  group_title text; group_course_id uuid; group_branch_id uuid; group_room_id uuid; group_teacher_id uuid;
  group_status_value public.group_status;
  saved_group public.groups%rowtype;
  effective_rules jsonb := p_rules;
begin
  if jsonb_typeof(coalesce(p_group, '{}'::jsonb)) <> 'object' then raise exception 'group_payload_invalid'; end if;
  if p_group_id is not null then
    select * into target_group from public.groups where id = p_group_id and organization_id = p_organization_id for update;
    if not found then raise exception 'group_not_found'; end if;
  end if;
  group_title := coalesce(nullif(trim(p_group->>'title'), ''), target_group.title);
  group_course_id := coalesce(nullif(p_group->>'course_id', '')::uuid, target_group.course_id);
  group_branch_id := case when p_group ? 'branch_id' then nullif(p_group->>'branch_id', '')::uuid else target_group.branch_id end;
  group_room_id := case when p_group ? 'room_id' then nullif(p_group->>'room_id', '')::uuid else target_group.room_id end;
  group_teacher_id := case when p_group ? 'teacher_id' then nullif(p_group->>'teacher_id', '')::uuid else target_group.teacher_id end;
  group_status_value := coalesce(nullif(p_group->>'status', '')::public.group_status, target_group.status, 'draft'::public.group_status);
  if group_title is null or group_course_id is null then raise exception 'group_required_fields_missing'; end if;
  if not exists (select 1 from public.courses where id = group_course_id and organization_id = p_organization_id) then raise exception 'course_not_found'; end if;
  if group_branch_id is not null and not exists (select 1 from public.branches where id = group_branch_id and organization_id = p_organization_id) then raise exception 'branch_not_found'; end if;
  if group_room_id is not null and not exists (select 1 from public.rooms where id = group_room_id and organization_id = p_organization_id and (group_branch_id is null or branch_id = group_branch_id)) then raise exception 'room_not_found_or_wrong_branch'; end if;
  if group_teacher_id is not null and not exists (select 1 from public.org_memberships where organization_id = p_organization_id and user_id = group_teacher_id and role = 'teacher' and is_active = true) then raise exception 'teacher_not_found'; end if;
  if p_group_id is null then
    insert into public.groups (organization_id,title,course_id,branch_id,room_id,teacher_id,status,age_from,age_to,capacity,starts_on,ends_on,price_monthly,show_on_site,sort_order,billing_enabled,lesson_price,charge_absent_excused,charge_absent_unexcused)
    values (p_organization_id,group_title,group_course_id,group_branch_id,group_room_id,group_teacher_id,group_status_value,
      nullif(p_group->>'age_from','')::int,nullif(p_group->>'age_to','')::int,coalesce(nullif(p_group->>'capacity','')::int,8),nullif(p_group->>'starts_on','')::date,nullif(p_group->>'ends_on','')::date,nullif(p_group->>'price_monthly','')::numeric,coalesce((p_group->>'show_on_site')::boolean,true),coalesce(nullif(p_group->>'sort_order','')::int,100),coalesce((p_group->>'billing_enabled')::boolean,false),nullif(p_group->>'lesson_price','')::numeric,coalesce((p_group->>'charge_absent_excused')::boolean,false),coalesce((p_group->>'charge_absent_unexcused')::boolean,true))
    returning id into saved_group_id;
  else
    update public.groups set title=group_title,course_id=group_course_id,branch_id=group_branch_id,room_id=group_room_id,teacher_id=group_teacher_id,status=group_status_value,
      age_from=case when p_group?'age_from' then nullif(p_group->>'age_from','')::int else target_group.age_from end,
      age_to=case when p_group?'age_to' then nullif(p_group->>'age_to','')::int else target_group.age_to end,
      capacity=case when p_group?'capacity' then coalesce(nullif(p_group->>'capacity','')::int,target_group.capacity) else target_group.capacity end,
      starts_on=case when p_group?'starts_on' then nullif(p_group->>'starts_on','')::date else target_group.starts_on end,
      ends_on=case when p_group?'ends_on' then nullif(p_group->>'ends_on','')::date else target_group.ends_on end,
      price_monthly=case when p_group?'price_monthly' then nullif(p_group->>'price_monthly','')::numeric else target_group.price_monthly end,
      show_on_site=case when p_group?'show_on_site' then (p_group->>'show_on_site')::boolean else target_group.show_on_site end,
      sort_order=case when p_group?'sort_order' then coalesce(nullif(p_group->>'sort_order','')::int,target_group.sort_order) else target_group.sort_order end,
      billing_enabled=case when p_group?'billing_enabled' then (p_group->>'billing_enabled')::boolean else target_group.billing_enabled end,
      lesson_price=case when p_group?'lesson_price' then nullif(p_group->>'lesson_price','')::numeric else target_group.lesson_price end,
      charge_absent_excused=case when p_group?'charge_absent_excused' then (p_group->>'charge_absent_excused')::boolean else target_group.charge_absent_excused end,
      charge_absent_unexcused=case when p_group?'charge_absent_unexcused' then (p_group->>'charge_absent_unexcused')::boolean else target_group.charge_absent_unexcused end,
      updated_at=now() where id=target_group.id;
    saved_group_id := target_group.id;
  end if;
  select * into saved_group from public.groups where id = saved_group_id;
  if saved_group.starts_on is not null and saved_group.ends_on is not null
    and saved_group.ends_on < saved_group.starts_on then
    raise exception 'group_date_range_invalid';
  end if;

  -- An omitted rule list means preserve weekly rules, not ignore a changed
  -- teacher or date range. Reuse the canonical rebuild with all its protections.
  if effective_rules is null and p_rebuild_future and p_group_id is not null
    and (
      saved_group.teacher_id is distinct from target_group.teacher_id
      or saved_group.room_id is distinct from target_group.room_id
      or saved_group.course_id is distinct from target_group.course_id
      or saved_group.starts_on is distinct from target_group.starts_on
      or saved_group.ends_on is distinct from target_group.ends_on
      or (saved_group.status = 'active' and target_group.status <> 'active')
    ) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'weekday', weekday, 'starts_at', starts_at, 'ends_at', ends_at
    ) order by weekday, starts_at), '[]'::jsonb) into effective_rules
    from public.group_schedule_rules
    where organization_id = p_organization_id and group_id = saved_group_id;
  end if;
  if effective_rules is not null then
    schedule_result := public.replace_group_schedule(p_organization_id,saved_group_id,effective_rules,p_rebuild_future);
  end if;
  return jsonb_build_object('group_id',saved_group_id,'schedule',schedule_result);
end;
$$;
revoke all on function public.save_group_with_schedule(uuid, uuid, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.save_group_with_schedule(uuid, uuid, jsonb, jsonb, boolean) to service_role;
