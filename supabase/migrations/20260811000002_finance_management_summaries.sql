-- Read-only aggregates for cutover and payroll UX. Source tables remain authoritative.

create or replace function public.finance_cutover_summary(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with paid as (
    select payment.id, payment.amount,
      exists (
        select 1 from public.billing_ledger_entries ledger
        where ledger.organization_id = payment.organization_id
          and ledger.payment_id = payment.id
          and ledger.entry_type = 'payment'
      ) as reflected
    from public.payments payment
    where payment.organization_id = p_organization_id
      and payment.status::text in ('paid', 'succeeded')
  )
  select jsonb_build_object(
    'paidCount', count(*),
    'paidAmount', coalesce(sum(amount), 0),
    'reflectedCount', count(*) filter (where reflected),
    'unreflectedCount', count(*) filter (where not reflected),
    'unreflectedAmount', coalesce(sum(amount) filter (where not reflected), 0)
  ) from paid;
$$;

revoke all on function public.finance_cutover_summary(uuid) from public, anon, authenticated;
grant execute on function public.finance_cutover_summary(uuid) to service_role;

create or replace function public.finance_payroll_month_summary(
  p_organization_id uuid,
  p_month date
) returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with month_rows as (
    select payroll.teacher_id, profile.full_name, payroll.amount, payroll.status
    from public.teacher_payroll_entries payroll
    join public.lesson_sessions session on session.id = payroll.lesson_session_id
    left join public.profiles profile on profile.id = payroll.teacher_id
    where payroll.organization_id = p_organization_id
      and session.lesson_date >= date_trunc('month', p_month)::date
      and session.lesson_date < (date_trunc('month', p_month) + interval '1 month')::date
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'teacherId', teacher_id,
    'teacherName', coalesce(full_name, 'Преподаватель'),
    'accrued', accrued,
    'approved', approved,
    'payable', payable,
    'paid', paid
  ) order by full_name), '[]'::jsonb)
  from (
    select teacher_id, max(full_name) as full_name,
      coalesce(sum(amount), 0) as accrued,
      coalesce(sum(amount) filter (where status in ('approved', 'paid')), 0) as approved,
      coalesce(sum(amount) filter (where status = 'approved'), 0) as payable,
      coalesce(sum(amount) filter (where status = 'paid'), 0) as paid
    from month_rows
    group by teacher_id
  ) summary;
$$;

revoke all on function public.finance_payroll_month_summary(uuid, date) from public, anon, authenticated;
grant execute on function public.finance_payroll_month_summary(uuid, date) to service_role;
