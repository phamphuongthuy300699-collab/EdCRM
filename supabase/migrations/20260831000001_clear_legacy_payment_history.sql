-- The owner confirmed that the existing payment history is non-production
-- test data and may be removed. Invoices, students, guardians, enrollments,
-- groups, schedule rules and lesson sessions are deliberately retained.
--
-- This is a one-time, forward-only maintenance step. Do not replace it with
-- TRUNCATE ... CASCADE: payments are referenced by the immutable billing
-- ledger and their deletion must also reconcile account balances/invoices.

create temporary table legacy_payment_cleanup_accounts
on commit drop
as
select distinct account_id
from public.billing_ledger_entries
where payment_id is not null
   or entry_type in ('payment', 'refund');

create temporary table legacy_payment_cleanup_invoices
on commit drop
as
select distinct invoice_id
from public.payments
where invoice_id is not null;

-- The ledger is append-only during normal application operation. Only this
-- migration disables its named mutation guard, inside the migration
-- transaction, to remove rows derived from the obsolete payments.
alter table public.billing_ledger_entries
  disable trigger billing_ledger_no_update;

do $$
declare
  removed_ledger integer := 0;
  removed_events integer := 0;
  removed_transactions integer := 0;
  removed_payments integer := 0;
begin
  delete from public.billing_ledger_entries
  where payment_id is not null
     or entry_type in ('payment', 'refund');
  get diagnostics removed_ledger = row_count;

  delete from public.payment_events;
  get diagnostics removed_events = row_count;

  delete from public.payment_transactions;
  get diagnostics removed_transactions = row_count;

  delete from public.payments;
  get diagnostics removed_payments = row_count;

  raise notice 'legacy payment cleanup removed payments=%, transactions=%, events=%, ledger_entries=%',
    removed_payments, removed_transactions, removed_events, removed_ledger;
end;
$$;

alter table public.billing_ledger_entries
  enable trigger billing_ledger_no_update;

-- Payment/refund entries contributed to the materialized account balance.
-- Recompute only affected accounts from the authoritative remaining journal.
update public.billing_accounts account
set
  balance = coalesce((
    select sum(entry.amount)
    from public.billing_ledger_entries entry
    where entry.account_id = account.id
  ), 0),
  updated_at = now()
where account.id in (select account_id from legacy_payment_cleanup_accounts);

-- The payment DELETE trigger already updates invoice state row-by-row. This
-- explicit pass makes the postcondition deterministic even on installations
-- where a historical trigger was temporarily absent.
update public.invoices invoice
set
  status = public.calculate_invoice_status(invoice.id),
  paid_at = case
    when public.calculate_invoice_status(invoice.id) = 'paid' then invoice.paid_at
    else null
  end,
  updated_at = now()
where invoice.id in (select invoice_id from legacy_payment_cleanup_invoices)
  and invoice.status <> 'cancelled';
