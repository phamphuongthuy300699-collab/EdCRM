# Finance production cutover

Billing is disabled by default. Deploying these migrations does not backfill historical payments and never processes old completed lessons in the background. Financial rows appear only after a new paid-payment settlement, a new lesson completion, or an explicit administrator reconciliation.

## Deploy

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npx supabase db push
```

Before `db push`, verify that the migration list ends with:

- `20260811000001_finance_reconciliation_management.sql`
- `20260811000002_finance_management_summaries.sql`

Do not run an automatic payment or lesson backfill. Do not enable billing for all groups in a bulk SQL update.

## First enablement checklist

1. Deploy migrations while `billing_enabled` remains disabled for every group.
2. Open **CRM → Финансы → Сверка** and review paid payments that have no payment ledger entry.
3. Choose one cutover method per family: explicitly reconcile selected historical payments or set an opening balance.
4. If using an opening balance, open the parent account and use the exact reason **«Начальный остаток при запуске CRM»**.
5. Do not reconcile the same historical payments after including them in the opening balance. Historical payments and opening balances must not be counted twice.
6. Configure a positive `lesson_price` for every group that will use billing.
7. Configure effective teacher rates before the first billable lesson.
8. Confirm that every billable student has exactly one billing contact.
9. Enable billing for one test group, complete one test lesson and verify attendance, one lesson debit per charged student, account balances and payroll snapshots.
10. Only after verification, enable billing for the remaining intended groups individually.

## Recovery and reconciliation

- A completed lesson with a resolved billing contact or lesson price is repaired through **Повторить финансовую обработку**.
- `reconcile_lesson_finance` only creates missing `lesson_debit` entries. It does not change attendance, lesson status, completion time or payroll.
- Missing teacher-rate payroll is repaired by adding an effective teacher rate; the existing rate repair updates only eligible accrued snapshots.
- Warnings remain in `finance_warnings` with `resolved_at`; they are not deleted.
- Repeating any reconciliation is idempotent and must produce no duplicate ledger entry.

## Payment and refund semantics

The current product and AlfaBank integration support one **full refund** for the complete payment amount. Partial refunds are not supported. A refunded payment has a final monotonic status: a delayed paid callback cannot change it back to paid.

## Verification queries

```sql
select warning_type, count(*)
from public.finance_warnings
where resolved_at is null
group by warning_type;

select entry_type, count(*), sum(amount)
from public.billing_ledger_entries
group by entry_type;

select status, count(*), sum(amount)
from public.teacher_payroll_entries
group by status;

select count(*) as debtors, sum(-balance) as total_debt
from public.billing_accounts
where balance < 0;
```

Rollback of ledger data must never update or delete immutable ledger rows. Correct an operator mistake with an explicit compensating manual entry and a clear reason.
