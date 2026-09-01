-- Isolated trial appointment domain. A standalone trial is not a lesson_session.

create table public.trial_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mode text not null check (mode in ('standalone', 'attached_session')),
  lesson_session_id uuid references public.lesson_sessions(id) on delete restrict,
  teacher_id uuid references public.profiles(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  room_id uuid references public.rooms(id) on delete restrict,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trial_events_mode_shape check (
    (
      mode = 'attached_session'
      and lesson_session_id is not null
      and teacher_id is null
      and branch_id is null
      and room_id is null
      and starts_at is null
      and ends_at is null
    )
    or
    (
      mode = 'standalone'
      and lesson_session_id is null
      and teacher_id is not null
      and branch_id is not null
      and starts_at is not null
      and ends_at is not null
      and ends_at > starts_at
    )
  )
);

create unique index trial_events_one_attached_per_session
  on public.trial_events (organization_id, lesson_session_id)
  where mode = 'attached_session';
create index trial_events_org_starts
  on public.trial_events (organization_id, starts_at)
  where mode = 'standalone';
create index trial_events_teacher_starts
  on public.trial_events (organization_id, teacher_id, starts_at)
  where mode = 'standalone';
create index trial_events_room_starts
  on public.trial_events (organization_id, room_id, starts_at)
  where mode = 'standalone';

create table public.trial_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trial_event_id uuid not null references public.trial_events(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete restrict,
  student_id uuid references public.students(id) on delete restrict,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'attended', 'no_show', 'cancelled')),
  result text
    check (result is null or result in ('interested', 'not_interested', 'enrolled', 'not_enrolled')),
  result_comment text,
  completed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trial_participants_one_subject check ((lead_id is null) <> (student_id is null))
);

create unique index trial_participants_event_lead_unique
  on public.trial_participants (trial_event_id, lead_id)
  where lead_id is not null;
create unique index trial_participants_event_student_unique
  on public.trial_participants (trial_event_id, student_id)
  where student_id is not null;
create index trial_participants_event_status
  on public.trial_participants (organization_id, trial_event_id, status);
create index trial_participants_lead
  on public.trial_participants (organization_id, lead_id)
  where lead_id is not null;
create index trial_participants_student
  on public.trial_participants (organization_id, student_id)
  where student_id is not null;

alter table public.trial_events enable row level security;
alter table public.trial_participants enable row level security;

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
      and role in ('owner', 'admin', 'manager')
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

create trigger trg_enforce_trial_event_tenant
before insert or update of organization_id, mode, lesson_session_id, teacher_id, branch_id, room_id, created_by
on public.trial_events
for each row execute function public.enforce_trial_event_tenant();

create or replace function public.enforce_trial_participant_tenant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.trial_events
    where id = new.trial_event_id
      and organization_id = new.organization_id
  ) then
    raise exception 'trial_event_wrong_organization';
  end if;
  if new.lead_id is not null and not exists (
    select 1 from public.leads
    where id = new.lead_id
      and organization_id = new.organization_id
      and archived_at is null
      and deleted_at is null
  ) then
    raise exception 'trial_subject_wrong_organization';
  end if;
  if new.student_id is not null and not exists (
    select 1 from public.students
    where id = new.student_id
      and organization_id = new.organization_id
      and status <> 'archived'
      and anonymized_at is null
      and deleted_at is null
  ) then
    raise exception 'trial_subject_wrong_organization';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_trial_participant_tenant
before insert or update of organization_id, trial_event_id, lead_id, student_id
on public.trial_participants
for each row execute function public.enforce_trial_participant_tenant();

create or replace function public.trial_subject_person_key(
  p_organization_id uuid,
  p_lead_id uuid,
  p_student_id uuid
) returns text
language plpgsql
stable
set search_path = public
as $$
declare
  linked_student_id uuid;
begin
  if p_student_id is not null then
    return 'student:' || p_student_id::text;
  end if;
  select coalesce(student_id, converted_student_id)
    into linked_student_id
  from public.leads
  where id = p_lead_id
    and organization_id = p_organization_id;
  if linked_student_id is not null then
    return 'student:' || linked_student_id::text;
  end if;
  return 'lead:' || p_lead_id::text;
end;
$$;

create or replace function public.trial_attached_occupancy(
  p_organization_id uuid,
  p_session_id uuid,
  p_extra_participants jsonb,
  p_exclude_participant_id uuid default null
) returns integer
language sql
stable
set search_path = public
as $$
  with target as (
    select group_id
    from public.lesson_sessions
    where id = p_session_id
      and organization_id = p_organization_id
  ),
  incoming as (
    select
      nullif(item->>'lead_id', '')::uuid as lead_id,
      nullif(item->>'student_id', '')::uuid as student_id
    from jsonb_array_elements(coalesce(p_extra_participants, '[]'::jsonb)) item
  ),
  people as (
    select 'student:' || enrollment.student_id::text as person_key
    from public.enrollments enrollment
    join target on target.group_id = enrollment.group_id
    where enrollment.organization_id = p_organization_id
      and enrollment.status = 'active'
    union
    select 'student:' || makeup.student_id::text
    from public.makeup_assignments makeup
    where makeup.organization_id = p_organization_id
      and makeup.target_session_id = p_session_id
      and makeup.status = 'scheduled'
    union
    select public.trial_subject_person_key(
      participant.organization_id,
      participant.lead_id,
      participant.student_id
    )
    from public.trial_participants participant
    join public.trial_events event on event.id = participant.trial_event_id
    where participant.organization_id = p_organization_id
      and event.lesson_session_id = p_session_id
      and participant.status <> 'cancelled'
      and (p_exclude_participant_id is null or participant.id <> p_exclude_participant_id)
    union
    select public.trial_subject_person_key(p_organization_id, incoming.lead_id, incoming.student_id)
    from incoming
  )
  select count(*)::integer from people;
$$;

create or replace function public.assert_standalone_trial_slot(
  p_organization_id uuid,
  p_excluded_event_id uuid,
  p_teacher_id uuid,
  p_room_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
) returns void
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(
    'trial-teacher:' || p_organization_id::text || ':' || p_teacher_id::text,
    0
  ));
  if p_room_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(
      'trial-room:' || p_organization_id::text || ':' || p_room_id::text,
      0
    ));
  end if;

  if exists (
    select 1
    from public.lesson_sessions session
    where session.organization_id = p_organization_id
      and session.status in ('planned', 'live')
      and (
        session.teacher_id = p_teacher_id
        or (p_room_id is not null and session.room_id = p_room_id)
      )
      and session.starts_at < p_ends_at
      and coalesce(session.ends_at, session.starts_at + interval '90 minutes') > p_starts_at
  ) then
    raise exception 'trial_slot_conflict';
  end if;

  if exists (
    select 1
    from public.trial_events event
    where event.organization_id = p_organization_id
      and event.mode = 'standalone'
      and (p_excluded_event_id is null or event.id <> p_excluded_event_id)
      and (
        event.teacher_id = p_teacher_id
        or (p_room_id is not null and event.room_id = p_room_id)
      )
      and event.starts_at < p_ends_at
      and event.ends_at > p_starts_at
      and exists (
        select 1 from public.trial_participants participant
        where participant.trial_event_id = event.id
          and participant.status <> 'cancelled'
      )
  ) then
    raise exception 'trial_slot_conflict';
  end if;
end;
$$;

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
begin
  if not exists (
    select 1 from public.org_memberships
    where organization_id = p_organization_id
      and user_id = p_actor_id
      and is_active = true
      and role in ('owner', 'admin', 'manager')
  ) then
    raise exception 'trial_actor_forbidden';
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

create or replace function public.crm_record_trial_participant_result(
  p_organization_id uuid,
  p_participant_id uuid,
  p_actor_id uuid,
  p_status text,
  p_result text,
  p_result_comment text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  participant public.trial_participants%rowtype;
  event public.trial_events%rowtype;
  actor_role text;
  session_teacher_id uuid;
  session_status text;
  group_capacity integer;
  room_capacity integer;
  occupancy integer;
  summary text;
  participant_person_key text;
begin
  select membership.role::text into actor_role
  from public.org_memberships membership
  where membership.organization_id = p_organization_id
    and membership.user_id = p_actor_id
    and membership.is_active = true;
  if actor_role is null or actor_role not in ('owner', 'admin', 'manager', 'teacher') then
    raise exception 'trial_forbidden';
  end if;
  if p_status not in ('scheduled', 'attended', 'no_show', 'cancelled') then
    raise exception 'trial_status_invalid';
  end if;
  if p_result is not null and p_result not in ('interested', 'not_interested', 'enrolled', 'not_enrolled') then
    raise exception 'trial_result_invalid';
  end if;

  select * into participant
  from public.trial_participants
  where id = p_participant_id
    and organization_id = p_organization_id
  for update;
  if not found then
    raise exception 'trial_participant_not_found';
  end if;
  select * into event
  from public.trial_events
  where id = participant.trial_event_id
    and organization_id = p_organization_id;

  if event.mode = 'attached_session' then
    select session.teacher_id, session.status::text, grp.capacity
      into session_teacher_id, session_status, group_capacity
    from public.lesson_sessions session
    join public.groups grp on grp.id = session.group_id
    where session.id = event.lesson_session_id;
  else
    session_teacher_id := event.teacher_id;
  end if;
  if actor_role = 'teacher' and session_teacher_id is distinct from p_actor_id then
    raise exception 'trial_forbidden';
  end if;

  if participant.status = 'cancelled' and p_status <> 'cancelled' then
    participant_person_key := public.trial_subject_person_key(
      p_organization_id,
      participant.lead_id,
      participant.student_id
    );
    if exists (
      select 1
      from public.trial_participants active
      where active.trial_event_id = event.id
        and active.id <> participant.id
        and active.status <> 'cancelled'
        and public.trial_subject_person_key(
          active.organization_id,
          active.lead_id,
          active.student_id
        ) = participant_person_key
    ) then
      raise exception 'trial_subject_duplicate';
    end if;
    if event.mode = 'attached_session' then
      perform 1 from public.lesson_sessions
      where id = event.lesson_session_id
        and organization_id = p_organization_id
        and status in ('planned', 'live')
      for update;
      if not found then
        raise exception 'trial_session_not_eligible';
      end if;
      if exists (
        select 1
        from public.enrollments enrollment
        join public.lesson_sessions session on session.group_id = enrollment.group_id
        where session.id = event.lesson_session_id
          and enrollment.organization_id = p_organization_id
          and enrollment.status = 'active'
          and 'student:' || enrollment.student_id::text = participant_person_key
      ) or exists (
        select 1
        from public.makeup_assignments makeup
        where makeup.organization_id = p_organization_id
          and makeup.target_session_id = event.lesson_session_id
          and makeup.status = 'scheduled'
          and 'student:' || makeup.student_id::text = participant_person_key
      ) then
        raise exception 'trial_subject_already_occupies_session';
      end if;
      occupancy := public.trial_attached_occupancy(
        p_organization_id,
        event.lesson_session_id,
        jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
          'lead_id', participant.lead_id,
          'student_id', participant.student_id
        ))),
        participant.id
      );
      if group_capacity is not null and occupancy > group_capacity then
        raise exception 'trial_capacity_exceeded';
      end if;
    else
      perform public.assert_standalone_trial_slot(
        p_organization_id,
        event.id,
        event.teacher_id,
        event.room_id,
        event.starts_at,
        event.ends_at
      );
      select capacity into room_capacity
      from public.rooms
      where id = event.room_id
        and organization_id = p_organization_id;
      if room_capacity is not null then
        select count(distinct public.trial_subject_person_key(
          active.organization_id,
          active.lead_id,
          active.student_id
        )) + 1
          into occupancy
        from public.trial_participants active
        where active.trial_event_id = event.id
          and active.status <> 'cancelled'
          and active.id <> participant.id;
        if occupancy > room_capacity then
          raise exception 'trial_capacity_exceeded';
        end if;
      end if;
    end if;
  end if;

  update public.trial_participants
  set status = p_status,
      result = p_result,
      result_comment = nullif(trim(p_result_comment), ''),
      completed_by = case when p_status = 'scheduled' then null else p_actor_id end,
      updated_at = now()
  where id = participant.id;

  summary := 'Результат пробного занятия: '
    || case p_status
      when 'scheduled' then 'запланирован'
      when 'attended' then 'пришёл'
      when 'no_show' then 'не пришёл'
      when 'cancelled' then 'отменён'
    end
    || case p_result
      when 'interested' then ', заинтересован'
      when 'not_interested' then ', не заинтересован'
      when 'enrolled' then ', решили зачисляться'
      when 'not_enrolled' then ', не зачислились'
      else ''
    end
    || case when nullif(trim(p_result_comment), '') is not null then '. ' || trim(p_result_comment) else '' end;
  insert into public.lead_interactions (
    organization_id, lead_id, student_id, manager_id, type, summary
  ) values (
    p_organization_id, participant.lead_id, participant.student_id,
    p_actor_id, 'comment', summary
  );

  return jsonb_build_object(
    'participant_id', participant.id,
    'status', p_status,
    'result', p_result,
    'result_comment', nullif(trim(p_result_comment), '')
  );
end;
$$;

create or replace function public.crm_update_trial_event(
  p_organization_id uuid,
  p_trial_event_id uuid,
  p_actor_id uuid,
  p_action text,
  p_teacher_id uuid,
  p_branch_id uuid,
  p_room_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event public.trial_events%rowtype;
  participant public.trial_participants%rowtype;
  room_capacity integer;
  participant_count integer;
begin
  if not exists (
    select 1 from public.org_memberships
    where organization_id = p_organization_id
      and user_id = p_actor_id
      and is_active = true
      and role in ('owner', 'admin', 'manager')
  ) then
    raise exception 'trial_actor_forbidden';
  end if;
  select * into event
  from public.trial_events
  where id = p_trial_event_id
    and organization_id = p_organization_id
  for update;
  if not found then
    raise exception 'trial_event_not_found';
  end if;

  if p_action = 'cancel' then
    for participant in
      select * from public.trial_participants
      where trial_event_id = event.id
        and status <> 'cancelled'
      for update
    loop
      update public.trial_participants
      set status = 'cancelled',
          result_comment = coalesce(nullif(trim(p_reason), ''), result_comment),
          completed_by = p_actor_id,
          updated_at = now()
      where id = participant.id;
      insert into public.lead_interactions (
        organization_id, lead_id, student_id, manager_id, type, summary
      ) values (
        p_organization_id, participant.lead_id, participant.student_id,
        p_actor_id, 'comment', 'Результат пробного занятия: запись отменена. ' || coalesce(nullif(trim(p_reason), ''), 'Причина не указана')
      );
    end loop;
    update public.trial_events set updated_at = now() where id = event.id;
    return jsonb_build_object('trial_event_id', event.id, 'cancelled', true);
  end if;

  if p_action <> 'update' or event.mode <> 'standalone' then
    raise exception 'trial_event_update_invalid';
  end if;
  if p_teacher_id is null or p_branch_id is null
    or p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
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
  select count(distinct public.trial_subject_person_key(
    current_participant.organization_id,
    current_participant.lead_id,
    current_participant.student_id
  )) into participant_count
  from public.trial_participants current_participant
  where current_participant.trial_event_id = event.id
    and current_participant.status <> 'cancelled';
  if room_capacity is not null and participant_count > room_capacity then
    raise exception 'trial_capacity_exceeded';
  end if;
  perform public.assert_standalone_trial_slot(
    p_organization_id,
    event.id,
    p_teacher_id,
    p_room_id,
    p_starts_at,
    p_ends_at
  );
  update public.trial_events
  set teacher_id = p_teacher_id,
      branch_id = p_branch_id,
      room_id = p_room_id,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      updated_at = now()
  where id = event.id;
  return jsonb_build_object('trial_event_id', event.id, 'updated', true);
end;
$$;

-- Keep ordinary schedule writers mutually exclusive with standalone trials.
create or replace function public.enforce_lesson_session_trial_conflict()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status not in ('planned', 'live') or new.teacher_id is null or new.starts_at is null then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'trial-teacher:' || new.organization_id::text || ':' || new.teacher_id::text,
    0
  ));
  if new.room_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(
      'trial-room:' || new.organization_id::text || ':' || new.room_id::text,
      0
    ));
  end if;
  if exists (
    select 1
    from public.trial_events event
    where event.organization_id = new.organization_id
      and event.mode = 'standalone'
      and (
        event.teacher_id = new.teacher_id
        or (new.room_id is not null and event.room_id = new.room_id)
      )
      and event.starts_at < coalesce(new.ends_at, new.starts_at + interval '90 minutes')
      and event.ends_at > new.starts_at
      and exists (
        select 1 from public.trial_participants participant
        where participant.trial_event_id = event.id
          and participant.status <> 'cancelled'
      )
  ) then
    raise exception 'trial_slot_conflict';
  end if;
  return new;
end;
$$;

create trigger trg_lesson_session_trial_conflict
before insert or update of organization_id, teacher_id, room_id, starts_at, ends_at, status
on public.lesson_sessions
for each row execute function public.enforce_lesson_session_trial_conflict();

-- Every writer that can consume a seat shares the lesson-session row lock with trial creation.
create or replace function public.enforce_makeup_trial_capacity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  session_capacity integer;
  occupancy integer;
begin
  if new.status <> 'scheduled' or new.target_session_id is null then
    return new;
  end if;
  select grp.capacity into session_capacity
  from public.lesson_sessions session
  join public.groups grp on grp.id = session.group_id and grp.organization_id = session.organization_id
  where session.id = new.target_session_id
    and session.organization_id = new.organization_id
  for update of session;
  if not found then
    raise exception 'trial_session_not_eligible';
  end if;
  occupancy := public.trial_attached_occupancy(
    new.organization_id,
    new.target_session_id,
    jsonb_build_array(jsonb_build_object('student_id', new.student_id)),
    null
  );
  if session_capacity is not null and occupancy > session_capacity then
    raise exception 'group_session_capacity_exceeded';
  end if;
  return new;
end;
$$;

create trigger trg_makeup_trial_capacity
before insert or update of organization_id, student_id, target_session_id, status
on public.makeup_assignments
for each row execute function public.enforce_makeup_trial_capacity();

create or replace function public.enforce_enrollment_trial_capacity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target record;
  occupancy integer;
begin
  if new.status <> 'active' or new.group_id is null then
    return new;
  end if;
  for target in
    select session.id, grp.capacity
    from public.lesson_sessions session
    join public.groups grp on grp.id = session.group_id and grp.organization_id = session.organization_id
    where session.organization_id = new.organization_id
      and session.group_id = new.group_id
      and session.status in ('planned', 'live')
    order by session.id
    for update of session
  loop
    occupancy := public.trial_attached_occupancy(
      new.organization_id,
      target.id,
      jsonb_build_array(jsonb_build_object('student_id', new.student_id)),
      null
    );
    if target.capacity is not null and occupancy > target.capacity then
      raise exception 'group_session_capacity_exceeded';
    end if;
  end loop;
  return new;
end;
$$;

create trigger trg_enrollment_trial_capacity
before insert or update of organization_id, student_id, group_id, status
on public.enrollments
for each row execute function public.enforce_enrollment_trial_capacity();

-- Preserve attached trial guests when the canonical lesson is rescheduled.
create or replace function public.reschedule_lesson_session(
  p_organization_id uuid,
  p_session_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  source public.lesson_sessions%rowtype;
  replacement_id uuid;
begin
  select * into source
  from public.lesson_sessions
  where id = p_session_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'Lesson session not found'; end if;
  if source.status not in ('planned', 'live') then raise exception 'Lesson session cannot be rescheduled'; end if;

  update public.lesson_sessions
  set status = 'moved', change_reason = p_reason, notification_status = 'not_required'
  where id = source.id;

  insert into public.lesson_sessions (
    organization_id, group_id, course_id, module_id, lesson_template_id,
    teacher_id, room_id, starts_at, ends_at, lesson_date, status,
    session_kind, topic, rescheduled_from_session_id, change_reason, notification_status
  ) values (
    source.organization_id, source.group_id, source.course_id, source.module_id, source.lesson_template_id,
    source.teacher_id, source.room_id, p_starts_at, p_ends_at, (p_starts_at at time zone 'Europe/Moscow')::date, 'planned',
    source.session_kind, source.topic, source.id, p_reason, 'pending'
  ) returning id into replacement_id;

  update public.trial_events
  set lesson_session_id = replacement_id, updated_at = now()
  where organization_id = p_organization_id
    and lesson_session_id = source.id
    and mode = 'attached_session';

  return replacement_id;
end;
$$;

create or replace function public.crm_cancel_lesson_session_with_trials(
  p_organization_id uuid,
  p_session_id uuid,
  p_actor_id uuid,
  p_reason text,
  p_notification_status text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  participant public.trial_participants%rowtype;
  cancelled_trials integer := 0;
begin
  if not exists (
    select 1 from public.org_memberships
    where organization_id = p_organization_id
      and user_id = p_actor_id
      and is_active = true
      and role in ('owner', 'admin', 'manager')
  ) then
    raise exception 'trial_actor_forbidden';
  end if;
  perform 1 from public.lesson_sessions
  where id = p_session_id
    and organization_id = p_organization_id
    and status = 'planned'
  for update;
  if not found then
    raise exception 'trial_session_not_eligible';
  end if;
  update public.lesson_sessions
  set status = 'cancelled',
      change_reason = p_reason,
      cancelled_at = now(),
      notification_status = p_notification_status
  where id = p_session_id;

  for participant in
    select trial_participant.*
    from public.trial_participants trial_participant
    join public.trial_events event on event.id = trial_participant.trial_event_id
    where event.organization_id = p_organization_id
      and event.lesson_session_id = p_session_id
      and event.mode = 'attached_session'
      and trial_participant.status <> 'cancelled'
    for update of trial_participant
  loop
    update public.trial_participants
    set status = 'cancelled',
        result_comment = coalesce(nullif(trim(p_reason), ''), result_comment),
        completed_by = p_actor_id,
        updated_at = now()
    where id = participant.id;
    insert into public.lead_interactions (
      organization_id, lead_id, student_id, manager_id, type, summary
    ) values (
      p_organization_id, participant.lead_id, participant.student_id,
      p_actor_id, 'comment', 'Пробная запись отменена вместе с занятием. ' || coalesce(nullif(trim(p_reason), ''), 'Причина не указана')
    );
    cancelled_trials := cancelled_trials + 1;
  end loop;
  return jsonb_build_object('session_id', p_session_id, 'cancelled_trial_participants', cancelled_trials);
end;
$$;

-- A generated lesson with attached trial guests is already a committed
-- appointment. Schedule rebuilds preserve it as an explicit exception, and
-- re-adopt it when the rebuilt rule produces the same occurrence.
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
                other.group_id = p_group_id
                or (
                  target_group.teacher_id is not null
                  and other.teacher_id = target_group.teacher_id
                )
                or (
                  target_group.room_id is not null
                  and other.room_id = target_group.room_id
                )
              )
          ) then
            raise exception 'New schedule conflicts with another lesson on %', occurrence_date;
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

revoke all on table public.trial_events from public, anon, authenticated;
revoke all on table public.trial_participants from public, anon, authenticated;
revoke all on function public.trial_subject_person_key(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.trial_attached_occupancy(uuid, uuid, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.assert_standalone_trial_slot(uuid, uuid, uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.crm_create_trial_event(uuid, uuid, text, uuid, uuid, uuid, uuid, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.crm_record_trial_participant_result(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.crm_update_trial_event(uuid, uuid, uuid, text, uuid, uuid, uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.crm_cancel_lesson_session_with_trials(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.enforce_lesson_session_trial_conflict() from public, anon, authenticated;
revoke all on function public.enforce_makeup_trial_capacity() from public, anon, authenticated;
revoke all on function public.enforce_enrollment_trial_capacity() from public, anon, authenticated;
revoke all on function public.replace_group_schedule(uuid, uuid, jsonb, boolean) from public, anon, authenticated;

grant execute on function public.crm_create_trial_event(uuid, uuid, text, uuid, uuid, uuid, uuid, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.crm_record_trial_participant_result(uuid, uuid, uuid, text, text, text) to service_role;
grant execute on function public.crm_update_trial_event(uuid, uuid, uuid, text, uuid, uuid, uuid, timestamptz, timestamptz, text) to service_role;
grant execute on function public.crm_cancel_lesson_session_with_trials(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.replace_group_schedule(uuid, uuid, jsonb, boolean) to service_role;
