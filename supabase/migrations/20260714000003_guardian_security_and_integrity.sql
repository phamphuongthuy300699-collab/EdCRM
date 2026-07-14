-- Blocker hotfix: lock SECURITY DEFINER functions and harden financial integrity.

alter table public.guardians
  add column if not exists merged_into_guardian_id uuid references public.guardians(id);

alter table public.guardians
  drop constraint if exists guardians_status_check;

alter table public.guardians
  add constraint guardians_status_check
  check (status in ('active', 'archived'));

create or replace function public.normalize_guardian_contacts()
returns trigger
language plpgsql
as $$
begin
  new.phone_normalized := public.normalize_ru_phone(new.phone);
  new.email_normalized := nullif(lower(trim(new.email)), '');
  return new;
end;
$$;

drop trigger if exists trg_normalize_guardian_contacts on public.guardians;

create trigger trg_normalize_guardian_contacts
before insert or update of phone, email
on public.guardians
for each row
execute function public.normalize_guardian_contacts();

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
    coalesce(nullif(p_student->>'status', ''), 'active'),
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

create or replace function public.crm_merge_guardians(
  p_organization_id uuid,
  p_master_guardian_id uuid,
  p_duplicate_guardian_id uuid,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_master public.guardians%rowtype;
  v_duplicate public.guardians%rowtype;
  v_moved jsonb := '{}'::jsonb;
  v_count integer;
begin
  if p_master_guardian_id = p_duplicate_guardian_id then
    raise exception 'same_guardian';
  end if;

  select * into v_master
  from public.guardians
  where id = p_master_guardian_id
    and organization_id = p_organization_id
    and status = 'active'
    and archived_at is null
    and deleted_at is null
    and anonymized_at is null
    and merged_into_guardian_id is null;

  select * into v_duplicate
  from public.guardians
  where id = p_duplicate_guardian_id
    and organization_id = p_organization_id
    and status = 'active'
    and archived_at is null
    and deleted_at is null
    and anonymized_at is null
    and merged_into_guardian_id is null;

  if v_master.id is null or v_duplicate.id is null then
    raise exception 'guardian_not_found_or_cross_org';
  end if;

  insert into public.student_guardians (organization_id, student_id, guardian_id, relation, is_primary, is_billing_contact)
  select organization_id, student_id, p_master_guardian_id, relation, is_primary, is_billing_contact
  from public.student_guardians
  where organization_id = p_organization_id
    and guardian_id = p_duplicate_guardian_id
  on conflict (student_id, guardian_id) do update
  set relation = coalesce(public.student_guardians.relation, excluded.relation),
      is_primary = public.student_guardians.is_primary or excluded.is_primary,
      is_billing_contact = public.student_guardians.is_billing_contact or excluded.is_billing_contact;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('student_guardians_upserted', v_count);

  delete from public.student_guardians where organization_id = p_organization_id and guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('student_guardians_removed', v_count);

  update public.invoices set guardian_id = p_master_guardian_id where organization_id = p_organization_id and guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count; v_moved := v_moved || jsonb_build_object('invoices', v_count);

  update public.payments set guardian_id = p_master_guardian_id where organization_id = p_organization_id and guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count; v_moved := v_moved || jsonb_build_object('payments', v_count);

  update public.discount_assignments set guardian_id = p_master_guardian_id where organization_id = p_organization_id and guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count; v_moved := v_moved || jsonb_build_object('discount_assignments', v_count);

  insert into public.guardian_users (organization_id, guardian_id, user_id)
  select organization_id, p_master_guardian_id, user_id
  from public.guardian_users
  where organization_id = p_organization_id and guardian_id = p_duplicate_guardian_id
  on conflict (organization_id, guardian_id, user_id) do nothing;
  get diagnostics v_count = row_count; v_moved := v_moved || jsonb_build_object('guardian_users_inserted', v_count);
  delete from public.guardian_users where organization_id = p_organization_id and guardian_id = p_duplicate_guardian_id;

  update public.guardian_messenger_accounts gma
  set guardian_id = p_master_guardian_id
  where gma.organization_id = p_organization_id
    and gma.guardian_id = p_duplicate_guardian_id
    and not exists (
      select 1 from public.guardian_messenger_accounts existing
      where existing.organization_id = gma.organization_id
        and existing.provider = gma.provider
        and existing.external_user_id = gma.external_user_id
        and existing.guardian_id = p_master_guardian_id
    );
  get diagnostics v_count = row_count; v_moved := v_moved || jsonb_build_object('guardian_messenger_accounts_moved', v_count);
  delete from public.guardian_messenger_accounts gma
  where gma.organization_id = p_organization_id
    and gma.guardian_id = p_duplicate_guardian_id
    and exists (
      select 1 from public.guardian_messenger_accounts existing
      where existing.organization_id = gma.organization_id
        and existing.provider = gma.provider
        and existing.external_user_id = gma.external_user_id
        and existing.guardian_id = p_master_guardian_id
    );

  update public.notification_outbox set guardian_id = p_master_guardian_id where organization_id = p_organization_id and guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count; v_moved := v_moved || jsonb_build_object('notification_outbox', v_count);

  update public.invoice_payment_links set guardian_id = p_master_guardian_id where organization_id = p_organization_id and guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count; v_moved := v_moved || jsonb_build_object('invoice_payment_links', v_count);

  update public.leads set converted_guardian_id = p_master_guardian_id where organization_id = p_organization_id and converted_guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count; v_moved := v_moved || jsonb_build_object('leads', v_count);

  update public.guardians
  set
    phone = coalesce(nullif(phone, ''), v_duplicate.phone),
    email = coalesce(nullif(email, ''), v_duplicate.email)
  where id = p_master_guardian_id and organization_id = p_organization_id;

  update public.guardians
  set archived_at = now(),
      archived_by = p_actor_id,
      status = 'archived',
      merged_into_guardian_id = p_master_guardian_id,
      notes = concat_ws(E'\n', notes, 'Merged into guardian ' || p_master_guardian_id::text)
  where id = p_duplicate_guardian_id and organization_id = p_organization_id;

  insert into public.crm_audit_log (organization_id, actor_id, action, entity_table, entity_id, entity_title, metadata)
  values (
    p_organization_id,
    p_actor_id,
    'guardian.merge',
    'guardians',
    p_master_guardian_id,
    v_master.full_name,
    jsonb_build_object('oldGuardianId', p_duplicate_guardian_id, 'masterGuardianId', p_master_guardian_id, 'duplicateTitle', v_duplicate.full_name, 'moved', v_moved)
  );

  return jsonb_build_object('oldGuardianId', p_duplicate_guardian_id, 'masterGuardianId', p_master_guardian_id, 'moved', v_moved);
end;
$$;

do $$
begin
  revoke all on function public.crm_create_student_with_guardians(uuid, jsonb, jsonb, uuid) from public;
  revoke all on function public.crm_merge_guardians(uuid, uuid, uuid, uuid) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.crm_create_student_with_guardians(uuid, jsonb, jsonb, uuid) from anon';
    execute 'revoke all on function public.crm_merge_guardians(uuid, uuid, uuid, uuid) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.crm_create_student_with_guardians(uuid, jsonb, jsonb, uuid) from authenticated';
    execute 'revoke all on function public.crm_merge_guardians(uuid, uuid, uuid, uuid) from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.crm_create_student_with_guardians(uuid, jsonb, jsonb, uuid) to service_role';
    execute 'grant execute on function public.crm_merge_guardians(uuid, uuid, uuid, uuid) to service_role';
  end if;
end;
$$;

create or replace function public.crm_create_invoice_with_discount(
  p_organization_id uuid,
  p_student_id uuid,
  p_guardian_id uuid,
  p_title text,
  p_amount numeric,
  p_due_date date,
  p_discount_assignment_id uuid default null,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student record;
  v_link record;
  v_enrollment record;
  v_discount record;
  v_base_amount numeric(12,2);
  v_discount_amount numeric(12,2) := 0;
  v_final_amount numeric(12,2);
  v_invoice record;
begin
  if nullif(trim(p_title), '') is null then
    raise exception 'invoice_title_required';
  end if;

  v_base_amount := round(p_amount, 2);
  if v_base_amount <= 0 then
    raise exception 'invoice_amount_invalid';
  end if;

  select id, full_name, status, archived_at, anonymized_at
  into v_student
  from public.students
  where id = p_student_id
    and organization_id = p_organization_id
    and deleted_at is null;

  if v_student.id is null or v_student.archived_at is not null or v_student.anonymized_at is not null or v_student.status not in ('active', 'paused') then
    raise exception 'student_not_billable';
  end if;

  select sg.guardian_id, g.full_name
  into v_link
  from public.student_guardians sg
  join public.guardians g on g.id = sg.guardian_id
  where sg.organization_id = p_organization_id
    and sg.student_id = p_student_id
    and sg.guardian_id = p_guardian_id
    and g.organization_id = p_organization_id
    and g.status = 'active'
    and g.archived_at is null
    and g.deleted_at is null
    and g.anonymized_at is null
    and g.merged_into_guardian_id is null;

  if v_link.guardian_id is null then
    raise exception 'guardian_not_linked_to_student';
  end if;

  select e.id, g.title as group_title
  into v_enrollment
  from public.enrollments e
  left join public.groups g on g.id = e.group_id
  where e.organization_id = p_organization_id
    and e.student_id = p_student_id
    and e.status = 'active'
  order by e.created_at desc
  limit 1;

  if p_discount_assignment_id is not null then
    select da.id, dt.title, dt.percent
    into v_discount
    from public.discount_assignments da
    join public.discount_types dt on dt.id = da.discount_type_id
    where da.id = p_discount_assignment_id
      and da.organization_id = p_organization_id
      and da.guardian_id = p_guardian_id
      and da.status = 'approved'
      and dt.is_active = true
      and (da.starts_at is null or da.starts_at <= now())
      and (da.ends_at is null or da.ends_at > now());

    if v_discount.id is null then
      raise exception 'discount_assignment_not_allowed';
    end if;

    v_discount_amount := round(v_base_amount * least(greatest(v_discount.percent, 0), 100) / 100, 2);
  end if;

  v_final_amount := greatest(0, v_base_amount - v_discount_amount);

  insert into public.invoices (
    organization_id,
    student_id,
    guardian_id,
    enrollment_id,
    title,
    description,
    amount,
    currency,
    status,
    due_date,
    issued_at,
    created_by,
    discount_amount,
    discount_title,
    discount_percent
  )
  values (
    p_organization_id,
    p_student_id,
    p_guardian_id,
    v_enrollment.id,
    trim(p_title),
    trim(p_title),
    v_final_amount,
    'RUB',
    'issued',
    p_due_date,
    now(),
    p_created_by,
    v_discount_amount,
    v_discount.title,
    coalesce(v_discount.percent, 0)
  )
  returning * into v_invoice;

  if p_discount_assignment_id is not null then
    insert into public.invoice_discounts (
      organization_id,
      invoice_id,
      discount_assignment_id,
      title,
      percent,
      amount
    )
    values (
      p_organization_id,
      v_invoice.id,
      p_discount_assignment_id,
      v_discount.title,
      v_discount.percent,
      v_discount_amount
    );
  end if;

  return jsonb_build_object(
    'invoice', to_jsonb(v_invoice),
    'studentName', v_student.full_name,
    'guardianName', v_link.full_name,
    'groupName', coalesce(v_enrollment.group_title, 'Без группы')
  );
end;
$$;

do $$
begin
  revoke all on function public.crm_create_invoice_with_discount(uuid, uuid, uuid, text, numeric, date, uuid, uuid) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.crm_create_invoice_with_discount(uuid, uuid, uuid, text, numeric, date, uuid, uuid) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.crm_create_invoice_with_discount(uuid, uuid, uuid, text, numeric, date, uuid, uuid) from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.crm_create_invoice_with_discount(uuid, uuid, uuid, text, numeric, date, uuid, uuid) to service_role';
  end if;
end;
$$;
