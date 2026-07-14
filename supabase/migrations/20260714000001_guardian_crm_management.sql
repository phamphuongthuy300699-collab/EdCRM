-- Make guardians a managed CRM entity without introducing duplicate parent tables.

alter table public.guardians
  add column if not exists phone_normalized text,
  add column if not exists email_normalized text,
  add column if not exists status text not null default 'active';

alter table public.student_guardians
  add column if not exists is_billing_contact boolean not null default false;

update public.guardians
set
  phone_normalized = case
    when phone is null or regexp_replace(phone, '\D', '', 'g') = '' then null
    when length(regexp_replace(phone, '\D', '', 'g')) = 10 then '+7' || regexp_replace(phone, '\D', '', 'g')
    when length(regexp_replace(phone, '\D', '', 'g')) = 11 and left(regexp_replace(phone, '\D', '', 'g'), 1) = '8' then '+7' || right(regexp_replace(phone, '\D', '', 'g'), 10)
    when length(regexp_replace(phone, '\D', '', 'g')) = 11 and left(regexp_replace(phone, '\D', '', 'g'), 1) = '7' then '+' || regexp_replace(phone, '\D', '', 'g')
    else null
  end,
  email_normalized = nullif(lower(trim(email)), '')
where phone_normalized is null or email_normalized is null;

create index if not exists idx_guardians_phone_normalized
  on public.guardians (organization_id, phone_normalized);

create index if not exists idx_guardians_email_normalized
  on public.guardians (organization_id, email_normalized);

create index if not exists idx_guardians_status
  on public.guardians (organization_id, status);

create index if not exists idx_student_guardians_guardian
  on public.student_guardians (organization_id, guardian_id);

create index if not exists idx_student_guardians_billing
  on public.student_guardians (organization_id, student_id, is_billing_contact);

create unique index if not exists idx_student_guardians_one_billing_contact
  on public.student_guardians (organization_id, student_id)
  where is_billing_contact = true;

create or replace function public.normalize_ru_phone(input_phone text)
returns text
language sql
immutable
as $$
  select case
    when input_phone is null or regexp_replace(input_phone, '\D', '', 'g') = '' then null
    when length(regexp_replace(input_phone, '\D', '', 'g')) = 10 then '+7' || regexp_replace(input_phone, '\D', '', 'g')
    when length(regexp_replace(input_phone, '\D', '', 'g')) = 11 and left(regexp_replace(input_phone, '\D', '', 'g'), 1) = '8' then '+7' || right(regexp_replace(input_phone, '\D', '', 'g'), 10)
    when length(regexp_replace(input_phone, '\D', '', 'g')) = 11 and left(regexp_replace(input_phone, '\D', '', 'g'), 1) = '7' then '+' || regexp_replace(input_phone, '\D', '', 'g')
    else null
  end;
$$;

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

  insert into public.students (organization_id, full_name, birth_date, status, notes)
  values (
    p_organization_id,
    trim(p_student->>'full_name'),
    nullif(p_student->>'birth_date', '')::date,
    coalesce(nullif(p_student->>'status', ''), 'active'),
    nullif(p_student->>'notes', '')
  )
  returning id into v_student_id;

  for v_guardian in select * from jsonb_array_elements(p_guardians)
  loop
    v_guardian_id := nullif(v_guardian->>'guardian_id', '')::uuid;

    if v_guardian_id is null then
      insert into public.guardians (
        organization_id,
        full_name,
        phone,
        phone_normalized,
        email,
        email_normalized,
        notes,
        status
      )
      values (
        p_organization_id,
        trim(v_guardian->>'full_name'),
        nullif(v_guardian->>'phone', ''),
        public.normalize_ru_phone(v_guardian->>'phone'),
        nullif(v_guardian->>'email', ''),
        nullif(lower(trim(v_guardian->>'email')), ''),
        nullif(v_guardian->>'notes', ''),
        'active'
      )
      returning id into v_guardian_id;
    else
      perform 1
      from public.guardians
      where id = v_guardian_id
        and organization_id = p_organization_id
        and deleted_at is null
        and anonymized_at is null;

      if not found then
        raise exception 'guardian_not_found';
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
