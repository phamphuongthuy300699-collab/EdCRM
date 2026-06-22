-- Migration to create idempotent lead conversion function with transaction lock

create or replace function public.convert_lead_to_student(
  p_lead_id uuid,
  p_group_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_lead public.leads%rowtype;
  v_guardian_id uuid;
  v_student_id uuid;
  v_enrollment_id uuid;
begin
  -- Advisory lock to prevent parallel transactions on the same lead
  perform pg_advisory_xact_lock(hashtext(p_lead_id::text));

  -- Get lead for update to lock the row
  select *
  into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'lead_not_found';
  end if;

  -- If lead is already converted, return existing IDs
  if v_lead.status = 'converted'
     and v_lead.converted_student_id is not null
     and v_lead.converted_guardian_id is not null then
    return jsonb_build_object(
      'ok', true,
      'alreadyConverted', true,
      'studentId', v_lead.converted_student_id,
      'guardianId', v_lead.converted_guardian_id
    );
  end if;

  -- Create guardian
  insert into public.guardians (
    organization_id,
    full_name,
    phone,
    email,
    notes
  )
  values (
    v_lead.organization_id,
    v_lead.parent_name,
    v_lead.parent_phone,
    v_lead.parent_email,
    'Создан из заявки ' || v_lead.id::text
  )
  returning id into v_guardian_id;

  -- Create student
  insert into public.students (
    organization_id,
    full_name,
    status,
    notes
  )
  values (
    v_lead.organization_id,
    coalesce(nullif(v_lead.child_name, ''), v_lead.parent_name || ' — ребенок'),
    'active',
    'Создан из заявки ' || v_lead.id::text || '. Возраст: ' || coalesce(v_lead.child_age::text, 'не указан')
  )
  returning id into v_student_id;

  -- Link student and guardian
  insert into public.student_guardians (
    organization_id,
    student_id,
    guardian_id,
    relation,
    is_primary
  )
  values (
    v_lead.organization_id,
    v_student_id,
    v_guardian_id,
    'Родитель',
    true
  )
  on conflict (student_id, guardian_id) do nothing;

  -- Enroll in group if provided
  if p_group_id is not null then
    insert into public.enrollments (
      organization_id,
      student_id,
      group_id,
      status,
      started_on
    )
    values (
      v_lead.organization_id,
      v_student_id,
      p_group_id,
      'active',
      current_date
    )
    on conflict (student_id, group_id, status) do nothing
    returning id into v_enrollment_id;
  end if;

  -- Update lead status
  update public.leads
  set
    status = 'converted',
    converted_student_id = v_student_id,
    converted_guardian_id = v_guardian_id,
    updated_at = now()
  where id = p_lead_id;

  return jsonb_build_object(
    'ok', true,
    'alreadyConverted', false,
    'studentId', v_student_id,
    'guardianId', v_guardian_id,
    'enrollmentId', v_enrollment_id
  );
end;
$$;
