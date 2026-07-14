-- Safe guardian duplicate merge. Keeps audit history and archives the duplicate.

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
    and deleted_at is null
    and anonymized_at is null;

  select * into v_duplicate
  from public.guardians
  where id = p_duplicate_guardian_id
    and organization_id = p_organization_id
    and deleted_at is null
    and anonymized_at is null;

  if v_master.id is null or v_duplicate.id is null then
    raise exception 'guardian_not_found_or_cross_org';
  end if;

  insert into public.student_guardians (
    organization_id,
    student_id,
    guardian_id,
    relation,
    is_primary,
    is_billing_contact
  )
  select
    organization_id,
    student_id,
    p_master_guardian_id,
    relation,
    is_primary,
    is_billing_contact
  from public.student_guardians
  where organization_id = p_organization_id
    and guardian_id = p_duplicate_guardian_id
  on conflict (student_id, guardian_id) do update
  set
    relation = coalesce(public.student_guardians.relation, excluded.relation),
    is_primary = public.student_guardians.is_primary or excluded.is_primary,
    is_billing_contact = public.student_guardians.is_billing_contact or excluded.is_billing_contact;

  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('student_guardians_upserted', v_count);

  delete from public.student_guardians
  where organization_id = p_organization_id
    and guardian_id = p_duplicate_guardian_id;

  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('student_guardians_removed', v_count);

  update public.invoices
  set guardian_id = p_master_guardian_id
  where organization_id = p_organization_id
    and guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('invoices', v_count);

  update public.payments
  set guardian_id = p_master_guardian_id
  where organization_id = p_organization_id
    and guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('payments', v_count);

  update public.discount_assignments
  set guardian_id = p_master_guardian_id
  where organization_id = p_organization_id
    and guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('discount_assignments', v_count);

  insert into public.guardian_users (organization_id, guardian_id, user_id)
  select organization_id, p_master_guardian_id, user_id
  from public.guardian_users
  where organization_id = p_organization_id
    and guardian_id = p_duplicate_guardian_id
  on conflict (organization_id, guardian_id, user_id) do nothing;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('guardian_users_inserted', v_count);

  delete from public.guardian_users
  where organization_id = p_organization_id
    and guardian_id = p_duplicate_guardian_id;

  update public.guardian_messenger_accounts gma
  set guardian_id = p_master_guardian_id
  where gma.organization_id = p_organization_id
    and gma.guardian_id = p_duplicate_guardian_id
    and not exists (
      select 1
      from public.guardian_messenger_accounts existing
      where existing.organization_id = gma.organization_id
        and existing.provider = gma.provider
        and existing.external_user_id = gma.external_user_id
        and existing.guardian_id = p_master_guardian_id
    );
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('guardian_messenger_accounts_moved', v_count);

  delete from public.guardian_messenger_accounts gma
  where gma.organization_id = p_organization_id
    and gma.guardian_id = p_duplicate_guardian_id
    and exists (
      select 1
      from public.guardian_messenger_accounts existing
      where existing.organization_id = gma.organization_id
        and existing.provider = gma.provider
        and existing.external_user_id = gma.external_user_id
        and existing.guardian_id = p_master_guardian_id
    );

  update public.notification_outbox
  set guardian_id = p_master_guardian_id
  where organization_id = p_organization_id
    and guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('notification_outbox', v_count);

  update public.invoice_payment_links
  set guardian_id = p_master_guardian_id
  where organization_id = p_organization_id
    and guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('invoice_payment_links', v_count);

  update public.leads
  set converted_guardian_id = p_master_guardian_id
  where organization_id = p_organization_id
    and converted_guardian_id = p_duplicate_guardian_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('leads', v_count);

  update public.guardians
  set
    archived_at = now(),
    archived_by = p_actor_id,
    status = 'archived',
    notes = concat_ws(E'\n', notes, 'Merged into guardian ' || p_master_guardian_id::text)
  where id = p_duplicate_guardian_id
    and organization_id = p_organization_id;

  insert into public.crm_audit_log (
    organization_id,
    actor_id,
    action,
    entity_table,
    entity_id,
    entity_title,
    metadata
  )
  values (
    p_organization_id,
    p_actor_id,
    'guardian.merge',
    'guardians',
    p_master_guardian_id,
    v_master.full_name,
    jsonb_build_object(
      'oldGuardianId', p_duplicate_guardian_id,
      'masterGuardianId', p_master_guardian_id,
      'duplicateTitle', v_duplicate.full_name,
      'moved', v_moved
    )
  );

  return jsonb_build_object(
    'oldGuardianId', p_duplicate_guardian_id,
    'masterGuardianId', p_master_guardian_id,
    'moved', v_moved
  );
end;
$$;
