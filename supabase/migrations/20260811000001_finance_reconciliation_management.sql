-- Explicit recovery tools for completed lessons and finance operations.
-- No historical payment or lesson is processed automatically by this migration.

create index if not exists billing_ledger_org_created_idx
  on public.billing_ledger_entries (organization_id, created_at desc);
create index if not exists teacher_payroll_org_status_created_idx
  on public.teacher_payroll_entries (organization_id, status, created_at desc);
create index if not exists finance_warnings_org_resolved_created_idx
  on public.finance_warnings (organization_id, resolved_at, created_at desc);
create index if not exists guardians_org_lower_name_idx
  on public.guardians (organization_id, lower(full_name) text_pattern_ops);
create index if not exists students_org_lower_name_idx
  on public.students (organization_id, lower(full_name) text_pattern_ops);

create or replace function public.reconcile_lesson_finance(
  p_organization_id uuid,
  p_lesson_session_id uuid,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.lesson_sessions%rowtype;
  target_group public.groups%rowtype;
  attendance_row record;
  billing_guardian uuid;
  target_account public.billing_accounts%rowtype;
  saved_entry uuid;
  source_attendance_id uuid;
  is_makeup boolean;
  should_charge boolean;
  created_debits integer := 0;
  active_warnings integer := 0;
begin
  select * into target_session
  from public.lesson_sessions
  where id = p_lesson_session_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'session_not_found'; end if;
  if target_session.status <> 'completed' then raise exception 'session_not_completed'; end if;

  select * into target_group
  from public.groups
  where id = target_session.group_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'group_not_found'; end if;

  if not target_group.billing_enabled or target_session.session_kind = 'trial' then
    update public.finance_warnings
    set resolved_at = coalesce(resolved_at, now())
    where organization_id = p_organization_id
      and lesson_session_id = target_session.id
      and warning_type in ('missing_lesson_price', 'missing_billing_contact')
      and resolved_at is null;
    return jsonb_build_object(
      'lessonSessionId', target_session.id,
      'createdDebits', 0,
      'activeWarnings', 0,
      'unchanged', true
    );
  end if;

  if target_group.lesson_price is null or target_group.lesson_price <= 0 then
    insert into public.finance_warnings (
      organization_id, warning_key, warning_type, lesson_session_id, details
    ) values (
      p_organization_id,
      'lesson-price:' || target_session.id,
      'missing_lesson_price',
      target_session.id,
      jsonb_build_object('groupId', target_group.id, 'groupTitle', target_group.title)
    )
    on conflict (organization_id, warning_key) do update
      set resolved_at = null, details = excluded.details;
    return jsonb_build_object(
      'lessonSessionId', target_session.id,
      'createdDebits', 0,
      'activeWarnings', 1,
      'unchanged', true
    );
  end if;

  update public.finance_warnings
  set resolved_at = coalesce(resolved_at, now())
  where organization_id = p_organization_id
    and warning_key = 'lesson-price:' || target_session.id
    and resolved_at is null;

  for attendance_row in
    select * from public.attendance
    where organization_id = p_organization_id
      and lesson_session_id = target_session.id
  loop
    source_attendance_id := null;
    billing_guardian := null;
    saved_entry := null;

    select makeup.source_attendance_id into source_attendance_id
    from public.makeup_assignments makeup
    where makeup.organization_id = p_organization_id
      and makeup.target_session_id = target_session.id
      and makeup.student_id = attendance_row.student_id
      and makeup.status in ('scheduled', 'completed')
    order by makeup.created_at desc
    limit 1;

    is_makeup := source_attendance_id is not null;
    should_charge := false;
    if is_makeup then
      should_charge := attendance_row.attendance_status in ('present', 'late')
        and not exists (
          select 1
          from public.billing_ledger_entries ledger
          join public.attendance source_attendance
            on source_attendance.lesson_session_id = ledger.lesson_session_id
           and source_attendance.student_id = ledger.student_id
          where ledger.organization_id = p_organization_id
            and ledger.entry_type = 'lesson_debit'
            and source_attendance.id = source_attendance_id
        );
    else
      should_charge := attendance_row.attendance_status in ('present', 'late')
        or (attendance_row.attendance_status = 'absent_excused' and target_group.charge_absent_excused)
        or (attendance_row.attendance_status = 'absent_unexcused' and target_group.charge_absent_unexcused);
    end if;

    if not should_charge then
      update public.finance_warnings
      set resolved_at = coalesce(resolved_at, now())
      where organization_id = p_organization_id
        and warning_key = 'billing-contact:' || target_session.id || ':' || attendance_row.student_id
        and resolved_at is null;
      continue;
    end if;

    select link.guardian_id into billing_guardian
    from public.student_guardians link
    where link.organization_id = p_organization_id
      and link.student_id = attendance_row.student_id
      and link.is_billing_contact = true
    limit 1;

    if billing_guardian is null then
      insert into public.finance_warnings (
        organization_id, warning_key, warning_type, lesson_session_id, student_id, details
      ) values (
        p_organization_id,
        'billing-contact:' || target_session.id || ':' || attendance_row.student_id,
        'missing_billing_contact',
        target_session.id,
        attendance_row.student_id,
        jsonb_build_object('groupId', target_group.id)
      )
      on conflict (organization_id, warning_key) do update
        set resolved_at = null, details = excluded.details;
      active_warnings := active_warnings + 1;
      continue;
    end if;

    insert into public.billing_accounts (organization_id, guardian_id)
    values (p_organization_id, billing_guardian)
    on conflict (organization_id, guardian_id) do nothing;

    select * into target_account
    from public.billing_accounts
    where organization_id = p_organization_id and guardian_id = billing_guardian
    for update;

    insert into public.billing_ledger_entries (
      organization_id, account_id, guardian_id, student_id, entry_type, amount,
      lesson_session_id, attendance_id, reason, created_by
    ) values (
      p_organization_id, target_account.id, billing_guardian, attendance_row.student_id,
      'lesson_debit', -target_group.lesson_price, target_session.id, attendance_row.id,
      'Занятие ' || target_session.lesson_date::text, p_actor_id
    )
    on conflict (organization_id, lesson_session_id, student_id)
      where lesson_session_id is not null and student_id is not null and entry_type = 'lesson_debit'
      do nothing
    returning id into saved_entry;

    if saved_entry is not null then
      update public.billing_accounts
      set balance = balance - target_group.lesson_price, updated_at = now()
      where id = target_account.id;
      created_debits := created_debits + 1;
    end if;

    if saved_entry is not null or exists (
      select 1 from public.billing_ledger_entries
      where organization_id = p_organization_id
        and lesson_session_id = target_session.id
        and student_id = attendance_row.student_id
        and entry_type = 'lesson_debit'
    ) then
      update public.finance_warnings
      set resolved_at = coalesce(resolved_at, now())
      where organization_id = p_organization_id
        and warning_key = 'billing-contact:' || target_session.id || ':' || attendance_row.student_id
        and resolved_at is null;
    end if;
  end loop;

  select count(*) into active_warnings
  from public.finance_warnings
  where organization_id = p_organization_id
    and lesson_session_id = target_session.id
    and warning_type in ('missing_lesson_price', 'missing_billing_contact')
    and resolved_at is null;

  return jsonb_build_object(
    'lessonSessionId', target_session.id,
    'createdDebits', created_debits,
    'activeWarnings', active_warnings,
    'unchanged', created_debits = 0
  );
end;
$$;

revoke all on function public.reconcile_lesson_finance(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.reconcile_lesson_finance(uuid, uuid, uuid)
  to service_role;

-- The current product contract supports one full refund for the whole payment.
-- A refund is final: stale provider callbacks cannot move it back to paid.
create or replace function public.settle_paid_payment(
  p_organization_id uuid,
  p_payment_id uuid,
  p_paid_at timestamptz default now(),
  p_raw_response jsonb default null,
  p_event_payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_payment public.payments%rowtype;
  target_invoice public.invoices%rowtype;
  target_account public.billing_accounts%rowtype;
  saved_entry uuid;
begin
  select * into target_payment
  from public.payments
  where id = p_payment_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'payment_not_found'; end if;
  if target_payment.status = 'refunded' then raise exception 'payment_already_refunded'; end if;
  if target_payment.invoice_id is null then raise exception 'payment_invoice_required'; end if;

  select * into target_invoice
  from public.invoices
  where id = target_payment.invoice_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'invoice_not_found'; end if;
  if target_invoice.guardian_id is null then raise exception 'invoice_guardian_required'; end if;

  insert into public.billing_accounts (organization_id, guardian_id)
  values (p_organization_id, target_invoice.guardian_id)
  on conflict (organization_id, guardian_id) do nothing;
  select * into target_account
  from public.billing_accounts
  where organization_id = p_organization_id and guardian_id = target_invoice.guardian_id
  for update;

  update public.payments
  set status = 'paid', paid_at = coalesce(paid_at, p_paid_at),
      guardian_id = target_invoice.guardian_id,
      raw_response = coalesce(p_raw_response, raw_response), updated_at = now()
  where id = target_payment.id;
  update public.invoices
  set status = public.calculate_invoice_status(target_invoice.id),
      paid_at = case when public.calculate_invoice_status(target_invoice.id) = 'paid'
        then coalesce(paid_at, p_paid_at) else paid_at end,
      updated_at = now()
  where id = target_invoice.id;

  insert into public.billing_ledger_entries (
    organization_id, account_id, guardian_id, student_id, entry_type, amount,
    payment_id, invoice_id, reason
  ) values (
    p_organization_id, target_account.id, target_invoice.guardian_id,
    target_invoice.student_id, 'payment', target_payment.amount,
    target_payment.id, target_invoice.id, 'Оплата счёта ' || target_invoice.number
  )
  on conflict (organization_id, payment_id)
    where payment_id is not null and entry_type = 'payment'
    do nothing
  returning id into saved_entry;

  if saved_entry is not null then
    update public.billing_accounts
    set balance = balance + target_payment.amount, updated_at = now()
    where id = target_account.id;
    insert into public.payment_events (
      organization_id, payment_id, invoice_id, provider, event_type, payload
    ) values (
      p_organization_id, target_payment.id, target_invoice.id,
      target_payment.provider::text, 'payment_paid', coalesce(p_event_payload, '{}'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'paymentId', target_payment.id,
    'invoiceId', target_invoice.id,
    'ledgerEntryId', saved_entry,
    'unchanged', saved_entry is null
  );
end;
$$;

revoke all on function public.settle_paid_payment(uuid, uuid, timestamptz, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.settle_paid_payment(uuid, uuid, timestamptz, jsonb, jsonb)
  to service_role;

create or replace function public.transition_teacher_payroll_period(
  p_organization_id uuid,
  p_teacher_id uuid,
  p_month date,
  p_status text,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  month_start date := date_trunc('month', p_month)::date;
  month_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  changed_count integer := 0;
  changed_amount numeric(14,2) := 0;
begin
  if p_status not in ('approved', 'paid') then raise exception 'invalid_payroll_transition'; end if;
  if not exists (
    select 1 from public.org_memberships
    where organization_id = p_organization_id and user_id = p_teacher_id
      and role = 'teacher' and is_active = true
  ) then raise exception 'teacher_not_found'; end if;

  if p_status = 'approved' and exists (
    select 1
    from public.teacher_payroll_entries payroll
    join public.lesson_sessions session on session.id = payroll.lesson_session_id
    join public.finance_warnings warning
      on warning.organization_id = payroll.organization_id
     and warning.lesson_session_id = payroll.lesson_session_id
     and warning.warning_type = 'missing_teacher_rate'
     and warning.resolved_at is null
    where payroll.organization_id = p_organization_id
      and payroll.teacher_id = p_teacher_id
      and payroll.status = 'accrued'
      and session.lesson_date >= month_start and session.lesson_date < month_end
  ) then raise exception 'teacher_rate_missing'; end if;

  if p_status = 'approved' then
    with changed as (
      update public.teacher_payroll_entries payroll
      set status = 'approved', approved_at = coalesce(approved_at, now()), approved_by = p_actor_id
      from public.lesson_sessions session
      where payroll.lesson_session_id = session.id
        and payroll.organization_id = p_organization_id
        and payroll.teacher_id = p_teacher_id
        and payroll.status = 'accrued'
        and session.lesson_date >= month_start and session.lesson_date < month_end
      returning payroll.amount
    ) select count(*)::integer, coalesce(sum(amount), 0) into changed_count, changed_amount from changed;
  else
    with changed as (
      update public.teacher_payroll_entries payroll
      set status = 'paid', paid_at = coalesce(paid_at, now()), paid_by = p_actor_id
      from public.lesson_sessions session
      where payroll.lesson_session_id = session.id
        and payroll.organization_id = p_organization_id
        and payroll.teacher_id = p_teacher_id
        and payroll.status = 'approved'
        and session.lesson_date >= month_start and session.lesson_date < month_end
      returning payroll.amount
    ) select count(*)::integer, coalesce(sum(amount), 0) into changed_count, changed_amount from changed;
  end if;

  return jsonb_build_object(
    'teacherId', p_teacher_id,
    'month', month_start,
    'status', p_status,
    'changedCount', changed_count,
    'changedAmount', changed_amount,
    'unchanged', changed_count = 0
  );
end;
$$;

revoke all on function public.transition_teacher_payroll_period(uuid, uuid, date, text, uuid)
  from public, anon, authenticated;
grant execute on function public.transition_teacher_payroll_period(uuid, uuid, date, text, uuid)
  to service_role;
