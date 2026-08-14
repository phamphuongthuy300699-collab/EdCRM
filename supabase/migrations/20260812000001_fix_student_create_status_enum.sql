-- Keep the production enum schema compatible with JSON text input. The later
-- client lifecycle migration converts students.status to text and replaces
-- this function for its expanded contract.
create or replace function public.crm_create_student_with_guardians(
  p_organization_id uuid,
  p_student jsonb,
  p_guardians jsonb,
  p_group_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_guardian jsonb;
  v_guardian_id uuid;
  v_link_id uuid;
  v_result_guardians jsonb := '[]'::jsonb;
  v_primary_count int;
  v_billing_count int;
  v_existing_ids uuid[];
  v_group record;
  v_active_enrollments int;
begin
  if p_organization_id is null then
    raise exception 'organization_required';
  end if;

  if nullif(trim(p_student->>'full_name'), '') is null then
    raise exception 'student_name_required';
  end if;

  if jsonb_typeof(p_guardians) <> 'array' or jsonb_array_length(p_guardians) = 0 then
    raise exception 'guardian_required';
  end if;

  select count(*) into v_primary_count
  from jsonb_array_elements(p_guardians) item
  where coalesce((item->>'is_primary')::boolean, false);

  select count(*) into v_billing_count
  from jsonb_array_elements(p_guardians) item
  where coalesce((item->>'is_billing_contact')::boolean, false);

  if v_primary_count <> 1 then
    raise exception 'exactly_one_primary_required';
  end if;

  if v_billing_count <> 1 then
    raise exception 'exactly_one_billing_contact_required';
  end if;

  select array_agg((item->>'guardian_id')::uuid) into v_existing_ids
  from jsonb_array_elements(p_guardians) item
  where nullif(item->>'guardian_id', '') is not null;

  if coalesce(array_length(v_existing_ids, 1), 0) <> coalesce((select count(distinct id) from unnest(v_existing_ids) id), 0) then
    raise exception 'duplicate_guardian_ids';
  end if;

  if p_group_id is not null then
    select id, organization_id, status, capacity, deleted_at
    into v_group
    from public.groups
    where id = p_group_id
    for update;

    if v_group.id is null or v_group.organization_id <> p_organization_id then
      raise exception 'group_not_found_or_cross_org';
    end if;

    if v_group.status <> 'active' or v_group.deleted_at is not null then
      raise exception 'group_not_active';
    end if;

    if coalesce(v_group.capacity, 0) > 0 then
      select count(*)
      into v_active_enrollments
      from public.enrollments
      where organization_id = p_organization_id
        and group_id = p_group_id
        and status in ('active', 'paused');

      if v_active_enrollments >= v_group.capacity then
        raise exception 'group_capacity_exceeded';
      end if;
    end if;
  end if;

  insert into public.students (organization_id, full_name, birth_date, status, notes)
  values (
    p_organization_id,
    trim(p_student->>'full_name'),
    nullif(p_student->>'birth_date', '')::date,
    coalesce(nullif(p_student->>'status', ''), 'active')::public.student_status,
    nullif(p_student->>'notes', '')
  )
  returning id into v_student_id;

  for v_guardian in select * from jsonb_array_elements(p_guardians)
  loop
    v_guardian_id := nullif(v_guardian->>'guardian_id', '')::uuid;

    if v_guardian_id is null then
      if nullif(trim(v_guardian->>'full_name'), '') is null then
        raise exception 'guardian_name_required';
      end if;

      insert into public.guardians (
        organization_id,
        full_name,
        phone,
        email,
        notes,
        status
      )
      values (
        p_organization_id,
        trim(v_guardian->>'full_name'),
        nullif(v_guardian->>'phone', ''),
        nullif(v_guardian->>'email', ''),
        nullif(v_guardian->>'notes', ''),
        'active'
      )
      returning id into v_guardian_id;
    else
      perform 1
      from public.guardians
      where id = v_guardian_id
        and organization_id = p_organization_id
        and status = 'active'
        and archived_at is null
        and deleted_at is null
        and anonymized_at is null
        and merged_into_guardian_id is null;

      if not found then
        raise exception 'guardian_not_found_or_inactive';
      end if;
    end if;

    if coalesce((v_guardian->>'is_billing_contact')::boolean, false) then
      update public.student_guardians
      set is_billing_contact = false
      where organization_id = p_organization_id
        and student_id = v_student_id;
    end if;

    insert into public.student_guardians (
      organization_id,
      student_id,
      guardian_id,
      relation,
      is_primary,
      is_billing_contact
    )
    values (
      p_organization_id,
      v_student_id,
      v_guardian_id,
      nullif(v_guardian->>'relation', ''),
      coalesce((v_guardian->>'is_primary')::boolean, false),
      coalesce((v_guardian->>'is_billing_contact')::boolean, false)
    )
    on conflict (student_id, guardian_id) do update
    set
      relation = excluded.relation,
      is_primary = excluded.is_primary,
      is_billing_contact = excluded.is_billing_contact
    returning id into v_link_id;

    v_result_guardians := v_result_guardians || jsonb_build_object(
      'guardian_id', v_guardian_id,
      'student_guardian_id', v_link_id
    );
  end loop;

  if p_group_id is not null then
    insert into public.enrollments (organization_id, student_id, group_id, status, started_on)
    values (p_organization_id, v_student_id, p_group_id, 'active', current_date);
  end if;

  return jsonb_build_object('student_id', v_student_id, 'guardians', v_result_guardians);
end;
$$;

do $$
begin
  revoke all on function public.crm_create_student_with_guardians(uuid, jsonb, jsonb, uuid) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.crm_create_student_with_guardians(uuid, jsonb, jsonb, uuid) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.crm_create_student_with_guardians(uuid, jsonb, jsonb, uuid) from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.crm_create_student_with_guardians(uuid, jsonb, jsonb, uuid) to service_role';
  end if;
end;
$$;
