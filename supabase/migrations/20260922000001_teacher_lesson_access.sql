-- Scoped teacher trial access and attendance; no data backfill or finance changes.
create or replace function public.crm_create_trial_event(
  p_organization_id uuid,
  p_actor_id uuid,
  p_mode text,
  p_lesson_session_id uuid,
  p_teacher_id uuid,
  p_branch_id uuid,
  p_room_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_participants jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id uuid;
  participant_id uuid;
  item jsonb;
  v_lead_id uuid;
  v_student_id uuid;
  person_key text;
  group_capacity integer;
  room_capacity integer;
  participant_count integer;
  occupancy integer;
  saved_participants jsonb := '[]'::jsonb;
  starts_label text;
  actor_role text;
begin
  select role::text into actor_role from public.org_memberships
  where organization_id = p_organization_id and user_id = p_actor_id and is_active = true;
  if actor_role is null or actor_role not in ('owner','admin','manager','teacher') then
    raise exception 'trial_actor_forbidden';
  end if;
  if actor_role = 'teacher' then
    if p_mode <> 'attached_session' then raise exception 'trial_actor_forbidden'; end if;
    perform 1 from public.lesson_sessions
    where id = p_lesson_session_id and organization_id = p_organization_id
      and teacher_id = p_actor_id for update;
    if not found then raise exception 'trial_actor_forbidden'; end if;
  end if;
  if p_mode not in ('standalone', 'attached_session') then
    raise exception 'trial_mode_invalid';
  end if;
  if jsonb_typeof(p_participants) <> 'array'
    or jsonb_array_length(p_participants) < 1
    or jsonb_array_length(p_participants) > 50 then
    raise exception 'trial_participants_invalid';
  end if;

  for item in select value from jsonb_array_elements(p_participants) loop
    v_lead_id := nullif(item->>'lead_id', '')::uuid;
    v_student_id := nullif(item->>'student_id', '')::uuid;
    if (v_lead_id is null) = (v_student_id is null) then
      raise exception 'trial_subject_invalid';
    end if;
    if v_lead_id is not null and not exists (
      select 1 from public.leads
      where id = v_lead_id
        and organization_id = p_organization_id
        and archived_at is null
        and deleted_at is null
    ) then
      raise exception 'trial_subject_wrong_organization';
    end if;
    if v_student_id is not null and not exists (
      select 1 from public.students
      where id = v_student_id
        and organization_id = p_organization_id
        and status <> 'archived'
        and anonymized_at is null
        and deleted_at is null
    ) then
      raise exception 'trial_subject_wrong_organization';
    end if;
  end loop;

  select count(distinct public.trial_subject_person_key(
    p_organization_id,
    nullif(participant_item.value->>'lead_id', '')::uuid,
    nullif(participant_item.value->>'student_id', '')::uuid
  ))
    into participant_count
  from jsonb_array_elements(p_participants) participant_item;
  if participant_count <> jsonb_array_length(p_participants) then
    raise exception 'trial_subject_duplicate';
  end if;

  if p_mode = 'attached_session' then
    if p_lesson_session_id is null
      or p_teacher_id is not null
      or p_branch_id is not null
      or p_room_id is not null
      or p_starts_at is not null
      or p_ends_at is not null then
      raise exception 'trial_mode_shape_invalid';
    end if;
    select grp.capacity
      into group_capacity
    from public.lesson_sessions session
    join public.groups grp
      on grp.id = session.group_id
      and grp.organization_id = session.organization_id
    where session.id = p_lesson_session_id
      and session.organization_id = p_organization_id
      and session.status in ('planned', 'live')
    for update of session;
    if not found then
      raise exception 'trial_session_not_eligible';
    end if;

    select id into event_id
    from public.trial_events
    where organization_id = p_organization_id
      and lesson_session_id = p_lesson_session_id;
    if event_id is null then
      insert into public.trial_events (
        organization_id, mode, lesson_session_id, created_by
      ) values (
        p_organization_id, 'attached_session', p_lesson_session_id, p_actor_id
      ) returning id into event_id;
    end if;

    if exists (
      with incoming as (
        select public.trial_subject_person_key(
          p_organization_id,
          nullif(value->>'lead_id', '')::uuid,
          nullif(value->>'student_id', '')::uuid
        ) as person_key
        from jsonb_array_elements(p_participants)
      ),
      existing_people as (
        select 'student:' || enrollment.student_id::text as person_key
        from public.enrollments enrollment
        join public.lesson_sessions session on session.group_id = enrollment.group_id
        where session.id = p_lesson_session_id
          and enrollment.organization_id = p_organization_id
          and enrollment.status = 'active'
        union
        select 'student:' || makeup.student_id::text
        from public.makeup_assignments makeup
        where makeup.organization_id = p_organization_id
          and makeup.target_session_id = p_lesson_session_id
          and makeup.status = 'scheduled'
        union
        select public.trial_subject_person_key(
          participant.organization_id,
          participant.lead_id,
          participant.student_id
        )
        from public.trial_participants participant
        where participant.trial_event_id = event_id
          and participant.status <> 'cancelled'
      )
      select 1
      from incoming
      join existing_people using (person_key)
    ) then
      raise exception 'trial_subject_already_occupies_session';
    end if;

    occupancy := public.trial_attached_occupancy(
      p_organization_id,
      p_lesson_session_id,
      p_participants,
      null
    );
    if group_capacity is not null and occupancy > group_capacity then
      raise exception 'trial_capacity_exceeded:%', greatest(0, group_capacity - (occupancy - participant_count));
    end if;
    select to_char(session.starts_at at time zone 'Europe/Moscow', 'DD.MM.YYYY HH24:MI')
      into starts_label
    from public.lesson_sessions session
    where session.id = p_lesson_session_id;
  else
    if p_lesson_session_id is not null
      or p_teacher_id is null
      or p_branch_id is null
      or p_starts_at is null
      or p_ends_at is null
      or p_ends_at <= p_starts_at then
      raise exception 'trial_mode_shape_invalid';
    end if;
    if not exists (
      select 1 from public.org_memberships
      where organization_id = p_organization_id
        and user_id = p_teacher_id
        and role = 'teacher'
        and is_active = true
    ) then
      raise exception 'trial_teacher_not_active';
    end if;
    if not exists (
      select 1 from public.branches
      where id = p_branch_id
        and organization_id = p_organization_id
        and is_active = true
        and archived_at is null
        and deleted_at is null
    ) then
      raise exception 'trial_branch_not_active';
    end if;
    if p_room_id is not null then
      select capacity into room_capacity
      from public.rooms
      where id = p_room_id
        and organization_id = p_organization_id
        and branch_id = p_branch_id
        and is_active = true
        and archived_at is null
        and deleted_at is null;
      if not found then
        raise exception 'trial_room_branch_mismatch';
      end if;
    end if;
    if room_capacity is not null and participant_count > room_capacity then
      raise exception 'trial_capacity_exceeded:%', room_capacity;
    end if;
    perform public.assert_standalone_trial_slot(
      p_organization_id,
      null,
      p_teacher_id,
      p_room_id,
      p_starts_at,
      p_ends_at
    );
    insert into public.trial_events (
      organization_id, mode, teacher_id, branch_id, room_id,
      starts_at, ends_at, created_by
    ) values (
      p_organization_id, 'standalone', p_teacher_id, p_branch_id, p_room_id,
      p_starts_at, p_ends_at, p_actor_id
    ) returning id into event_id;
    starts_label := to_char(p_starts_at at time zone 'Europe/Moscow', 'DD.MM.YYYY HH24:MI');
  end if;

  for item in select value from jsonb_array_elements(p_participants) loop
    v_lead_id := nullif(item->>'lead_id', '')::uuid;
    v_student_id := nullif(item->>'student_id', '')::uuid;
    person_key := public.trial_subject_person_key(p_organization_id, v_lead_id, v_student_id);

    if exists (
      select 1
      from public.trial_participants existing
      where existing.trial_event_id = event_id
        and existing.status <> 'cancelled'
        and public.trial_subject_person_key(
          existing.organization_id,
          existing.lead_id,
          existing.student_id
        ) = person_key
    ) then
      raise exception 'trial_subject_duplicate';
    end if;

    if v_lead_id is not null then
      insert into public.trial_participants (
        organization_id, trial_event_id, lead_id, status
      ) values (
        p_organization_id, event_id, v_lead_id, 'scheduled'
      )
      on conflict (trial_event_id, lead_id) where lead_id is not null
      do update set
        status = 'scheduled',
        result = null,
        result_comment = null,
        completed_by = null,
        updated_at = now()
      returning id into participant_id;
    else
      insert into public.trial_participants (
        organization_id, trial_event_id, student_id, status
      ) values (
        p_organization_id, event_id, v_student_id, 'scheduled'
      )
      on conflict (trial_event_id, student_id) where student_id is not null
      do update set
        status = 'scheduled',
        result = null,
        result_comment = null,
        completed_by = null,
        updated_at = now()
      returning id into participant_id;
    end if;

    insert into public.lead_interactions (
      organization_id, lead_id, student_id, manager_id,
      type, result, summary
    ) values (
      p_organization_id, v_lead_id, v_student_id, p_actor_id,
      'meeting', 'scheduled_trial', 'Пробное занятие запланировано: ' || starts_label
    );
    if v_lead_id is not null then
      update public.leads
      set status = 'trial_scheduled', updated_at = now()
      where id = v_lead_id
        and organization_id = p_organization_id
        and status in ('new', 'contacted', 'lost');
    end if;
    saved_participants := saved_participants || jsonb_build_object(
      'participant_id', participant_id,
      'lead_id', v_lead_id,
      'student_id', v_student_id
    );
  end loop;

  return jsonb_build_object(
    'trial_event_id', event_id,
    'mode', p_mode,
    'participants', saved_participants
  );
end;
$$;

create or replace function public.save_lesson_attendance(
  p_organization_id uuid,
  p_session_id uuid,
  p_actor_id uuid,
  p_is_admin boolean,
  p_records jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.lesson_sessions%rowtype;
  saved_count integer := 0;
  new_absence_student_ids jsonb := '[]'::jsonb;
begin
  select * into target_session
  from public.lesson_sessions
  where id = p_session_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'session_not_found'; end if;
  if not p_is_admin and (target_session.teacher_id is null or target_session.teacher_id <> p_actor_id) then
    raise exception 'foreign_teacher_session';
  end if;
  if target_session.status not in ('planned','live','completed') then raise exception 'session_not_editable'; end if;
  if target_session.starts_at > now() then raise exception 'session_not_started_yet'; end if;
  if jsonb_typeof(coalesce(p_records, '[]'::jsonb)) <> 'array' then raise exception 'attendance_payload_invalid'; end if;

  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(student_id uuid, status text, comment text, absence_reason text)
    where record.student_id is null or record.status not in ('unmarked', 'present', 'late', 'absent_excused', 'absent_unexcused')
  ) then raise exception 'attendance_record_invalid'; end if;
  if (select count(*) from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(student_id uuid)) <>
     (select count(distinct student_id) from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(student_id uuid))
  then raise exception 'attendance_student_duplicate'; end if;
  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(student_id uuid)
    where not exists (
      select 1 from public.enrollments enrollment
      where enrollment.organization_id = p_organization_id
        and enrollment.group_id = target_session.group_id
        and enrollment.student_id = record.student_id
        and enrollment.status = 'active'
    ) and not exists (
      select 1 from public.makeup_assignments makeup
      where makeup.organization_id = p_organization_id
        and makeup.target_session_id = target_session.id
        and makeup.student_id = record.student_id
        and makeup.status in ('scheduled','completed')
    )
    and not exists (
      select 1 from public.attendance previous
      where previous.organization_id = p_organization_id
        and previous.lesson_session_id = target_session.id
        and previous.student_id = record.student_id
    )
  ) then raise exception 'attendance_student_not_in_roster'; end if;

  select coalesce(jsonb_agg(record.student_id), '[]'::jsonb) into new_absence_student_ids
  from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(student_id uuid, status text)
  left join public.attendance previous
    on previous.organization_id = p_organization_id
    and previous.lesson_session_id = target_session.id
    and previous.student_id = record.student_id
  where record.status in ('absent_excused', 'absent_unexcused')
    and coalesce(previous.attendance_status, 'unmarked') not in ('absent_excused', 'absent_unexcused');

  -- Explicit historical corrections are audited; no financial reconciliation here.
  if target_session.status = 'completed' then
    insert into public.audit_log(organization_id,actor_user_id,entity_type,entity_id,action,before,after)
    values (p_organization_id,p_actor_id,'lesson_attendance',target_session.id,'correct_completed_attendance',
      (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from public.attendance a
       where a.organization_id=p_organization_id and a.lesson_session_id=target_session.id),p_records);
  end if;
  if target_session.status = 'planned' then
    update public.lesson_sessions set status='live',started_at=coalesce(started_at,starts_at),materials_unlocked=true
    where id=target_session.id;
  end if;
  -- Do not notify parents about historical corrections days/months later.
  if target_session.status = 'completed'
    or (target_session.starts_at at time zone 'Europe/Moscow')::date < (now() at time zone 'Europe/Moscow')::date then
    new_absence_student_ids := '[]'::jsonb;
  end if;

  insert into public.attendance (
    organization_id, group_id, lesson_session_id, lesson_date, student_id,
    attendance_status, is_present, comment, absence_reason, marked_by, marked_at
  )
  select
    p_organization_id, target_session.group_id, target_session.id,
    coalesce(target_session.lesson_date, (target_session.starts_at at time zone 'Europe/Moscow')::date),
    record.student_id, record.status,
    record.status in ('present', 'late'), nullif(record.comment, ''), nullif(record.absence_reason, ''), p_actor_id, now()
  from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(student_id uuid, status text, comment text, absence_reason text)
  on conflict (lesson_session_id, student_id) do update set
    attendance_status = excluded.attendance_status,
    is_present = excluded.is_present,
    comment = excluded.comment,
    absence_reason = excluded.absence_reason,
    marked_by = excluded.marked_by,
    marked_at = excluded.marked_at;
  get diagnostics saved_count = row_count;

  return jsonb_build_object('saved', saved_count, 'new_absence_student_ids', new_absence_student_ids, 'session_status', case when target_session.status='planned' then 'live' else target_session.status::text end);
end;
$$;

revoke all on function public.save_lesson_attendance(uuid, uuid, uuid, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.save_lesson_attendance(uuid, uuid, uuid, boolean, jsonb) to service_role;

create or replace function public.enforce_trial_event_tenant()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  validate_creator boolean := tg_op = 'INSERT';
begin
  if tg_op = 'UPDATE' then
    validate_creator := new.organization_id is distinct from old.organization_id
      or new.created_by is distinct from old.created_by;
  end if;

  if validate_creator and not exists (
    select 1 from public.org_memberships
    where organization_id = new.organization_id
      and user_id = new.created_by
      and is_active = true
      and (role in ('owner', 'admin', 'manager') or (
        role = 'teacher' and new.mode = 'attached_session' and exists (
          select 1 from public.lesson_sessions s
          where s.id=new.lesson_session_id and s.organization_id=new.organization_id
            and s.teacher_id=new.created_by
        )
      ))
  ) then
    raise exception 'trial_actor_forbidden';
  end if;

  if new.mode = 'attached_session' then
    if not exists (
      select 1 from public.lesson_sessions
      where id = new.lesson_session_id
        and organization_id = new.organization_id
    ) then
      raise exception 'trial_session_wrong_organization';
    end if;
  else
    if not exists (
      select 1 from public.org_memberships
      where organization_id = new.organization_id
        and user_id = new.teacher_id
        and role = 'teacher'
        and is_active = true
    ) then
      raise exception 'trial_teacher_not_active';
    end if;
    if not exists (
      select 1 from public.branches
      where id = new.branch_id
        and organization_id = new.organization_id
        and is_active = true
        and archived_at is null
        and deleted_at is null
    ) then
      raise exception 'trial_branch_not_active';
    end if;
    if new.room_id is not null then
      if not exists (
        select 1 from public.rooms
        where id = new.room_id
          and organization_id = new.organization_id
          and branch_id = new.branch_id
          and is_active = true
          and archived_at is null
          and deleted_at is null
      ) then
        raise exception 'trial_room_branch_mismatch';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Atomic walk-in intake: capacity/tenant failure rolls back the new lead too.
create or replace function public.crm_add_teacher_walkin(
 p_organization_id uuid, p_actor_id uuid, p_session_id uuid, p_request_id uuid,
 p_child_name text, p_parent_name text default '', p_parent_phone text default ''
) returns jsonb language plpgsql security definer set search_path=public as $$
declare existing_lead public.leads%rowtype; result jsonb;
begin
 perform 1 from public.org_memberships where organization_id=p_organization_id
   and user_id=p_actor_id and role='teacher' and is_active;
 if not found then raise exception 'trial_actor_forbidden'; end if;
 perform 1 from public.lesson_sessions where id=p_session_id and organization_id=p_organization_id
   and teacher_id=p_actor_id and status in ('planned','live') for update;
 if not found then raise exception 'trial_actor_forbidden'; end if;
 if p_request_id is null or length(trim(coalesce(p_child_name,''))) not between 2 and 150
   or length(coalesce(p_parent_name,''))>150 or length(coalesce(p_parent_phone,''))>40 then
   raise exception 'trial_subject_invalid';
 end if;
 select * into existing_lead from public.leads where id=p_request_id;
 if found then
   if existing_lead.organization_id is distinct from p_organization_id
     or existing_lead.assigned_to is distinct from p_actor_id
     or existing_lead.source <> 'teacher_walkin'
     or existing_lead.child_name <> trim(p_child_name) then raise exception 'trial_actor_forbidden'; end if;
   select jsonb_build_object('trial_event_id',e.id,'mode','attached_session','unchanged',true)
     into result from public.trial_participants p join public.trial_events e on e.id=p.trial_event_id
     where p.lead_id=p_request_id and p.organization_id=p_organization_id
       and e.lesson_session_id=p_session_id and p.status<>'cancelled';
   if result is not null then return result; end if;
 else
   insert into public.leads(id,organization_id,source,assigned_to,child_name,parent_name,parent_phone)
   values(p_request_id,p_organization_id,'teacher_walkin',p_actor_id,trim(p_child_name),trim(coalesce(p_parent_name,'')),trim(coalesce(p_parent_phone,'')));
 end if;
 return public.crm_create_trial_event(p_organization_id,p_actor_id,'attached_session',p_session_id,
   null,null,null,null,null,jsonb_build_array(jsonb_build_object('lead_id',p_request_id)));
end;
$$;
revoke all on function public.crm_add_teacher_walkin(uuid,uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.crm_add_teacher_walkin(uuid,uuid,uuid,uuid,text,text,text) to service_role;

-- Called by a host timer. No attendance, completion, billing, payroll or messages.
create or replace function public.crm_start_due_lessons()
returns integer language plpgsql security definer set search_path=public as $$
declare changed integer;
begin
 with due as (
   select s.id from public.lesson_sessions s
   join public.groups g on g.id=s.group_id and g.organization_id=s.organization_id
   where s.status='planned' and s.starts_at<=now() and s.ends_at>now()
     and g.status='active' and g.archived_at is null and g.deleted_at is null
     and exists(select 1 from public.org_memberships m where m.organization_id=s.organization_id
       and m.user_id=s.teacher_id and m.role='teacher' and m.is_active)
   for update of s skip locked
 )
 update public.lesson_sessions s set status='live',started_at=coalesce(s.started_at,s.starts_at),materials_unlocked=true
 from due where s.id=due.id;
 get diagnostics changed=row_count;
 return changed;
end;
$$;
revoke all on function public.crm_start_due_lessons() from public,anon,authenticated;
grant execute on function public.crm_start_due_lessons() to service_role;
