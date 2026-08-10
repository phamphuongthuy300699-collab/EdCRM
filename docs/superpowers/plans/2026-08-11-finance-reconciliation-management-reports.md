# Finance Reconciliation and Management Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make EdCRM finance recoverable after missed processing, provide a controlled production cutover, and expose operational management reports calculated from authoritative entities.

**Architecture:** Keep `billing_accounts`, `billing_ledger_entries`, `finance_warnings`, `teacher_payroll_entries`, payments, lessons and attendance authoritative. Add transaction-safe reconciliation and payroll RPCs in one forward migration, expose focused paginated organization-scoped APIs, and keep report calculations server-side without shadow analytics tables.

**Tech Stack:** PostgreSQL/Supabase migrations and pgTAP, Next.js App Router, Supabase JS, React 19, Zod, Vitest, Playwright.

---

### Task 1: Restore reproducible fresh-database bootstrap

**Files:**
- Modify: `supabase/migrations/20260621000001_lms_sales_light.sql`
- Test: full migration chain via `npx supabase db reset`

- [ ] Confirm RED: fresh reset fails because the LMS demo rows reference organization `a3848a60-a292-491a-85eb-7f2824cf4e77` before `20260701000000_baseline_roboks_seed_fixup.sql` creates it.
- [ ] Wrap only the legacy demo-data section in a conditional block that runs when both the organization and primary course already exist; leave all schema DDL unchanged.
- [ ] Run `npx supabase db reset` and verify every migration through the newest finance migration applies.
- [ ] Commit as `fix(db): restore reproducible supabase reset`.

### Task 2: Define real DB lifecycle tests before reconciliation implementation

**Files:**
- Create: `supabase/tests/finance_lifecycle.test.sql`
- Modify: `package.json`

- [ ] Add pgTAP fixtures for an isolated organization, teacher, guardian, student, group, sessions, invoice and payment.
- [ ] Add failing assertions for paid settlement/idempotency, full refund/idempotency/monotonic status, lesson debit/idempotency/negative balance, absence policies, trial, makeup, missing contact repair, missing price repair, missing teacher rate repair and historical explicit cutover.
- [ ] Add exact report-fixture totals for cash received, lesson debits, attendance, payroll and debt.
- [ ] Run `npx supabase test db supabase/tests/finance_lifecycle.test.sql` and confirm failures are caused by missing reconciliation/hardening functions.

### Task 3: Add transaction-safe reconciliation and payroll period operations

**Files:**
- Create: `supabase/migrations/20260811000001_finance_reconciliation_management.sql`
- Test: `supabase/tests/finance_lifecycle.test.sql`

- [ ] Add `reconcile_lesson_finance(organization_id, lesson_session_id, actor_id)` that locks only a completed lesson, creates only absent lesson debits, updates balances, resolves only repaired warnings, leaves attendance/status/completed time/payroll unchanged, and is idempotent.
- [ ] Harden `settle_paid_payment` so a refunded payment cannot return to paid; document full-refund-only semantics in function errors/comments.
- [ ] Add DB-safe idempotent bulk payroll transition for one teacher and month, using snapshot amounts and legal accrued→approved→paid transitions.
- [ ] Add indexed server-side account search support without storing derived analytics data.
- [ ] Run the DB test and make every lifecycle assertion green.
- [ ] Commit as `feat(finance): add reconciliation and payroll period operations`.

### Task 4: Split finance API into paginated operational datasets and exports

**Files:**
- Modify: `apps/web/src/app/api/crm/finance/route.ts`
- Create: `apps/web/src/app/api/crm/finance/reconcile/route.ts`
- Create: `apps/web/src/app/api/crm/finance/export/route.ts`
- Create: `apps/web/src/lib/finance/csv.ts`
- Test: `apps/web/src/__tests__/finance-management-contract.test.ts`

- [ ] Write RED contract tests for `view`, `page`, `pageSize`, date/group/teacher/status/warning filters and organization-scoped CSV.
- [ ] Implement server-side account search using matching guardian/student IDs and paginated Supabase ranges; paginate ledger, payroll and warnings independently.
- [ ] Add cutover summary and explicit selected-payment reconciliation; never auto-backfill.
- [ ] Add lesson reconciliation endpoint and opening-balance action with explicit double-count warning acknowledgement.
- [ ] Export UTF-8 BOM CSV only for visible attendance, debt, payroll and ledger fields.
- [ ] Run focused Vitest tests green.

### Task 5: Make Finance problems, cutover and payroll actionable

**Files:**
- Modify: `apps/web/src/app/(crm)/crm/finance/page.tsx`
- Create: `apps/web/src/app/(crm)/crm/finance/FinancePagination.tsx`
- Test: `apps/web/src/__tests__/finance-projections.test.ts`

- [ ] Add problem filters: all, billing contact, lesson price, teacher rate.
- [ ] Add contextual links to student/group/teacher settings and a “Повторить финансовую обработку” action for completed lessons.
- [ ] Add “Сверка” view with historical paid-payment counts/sums, explicit selection and opening-balance warning.
- [ ] Add month filter, teacher summaries and bulk approve/pay actions using the DB RPC.
- [ ] Add pagination/load-more controls and ledger CSV export.
- [ ] Keep manager read-only behavior and mobile layouts intact.
- [ ] Run focused Vitest tests green.
- [ ] Commit as `feat(finance): add reconciliation and production cutover tools`.

### Task 6: Add authoritative operational reports and CSV

**Files:**
- Create: `apps/web/src/app/api/crm/reports/route.ts`
- Create: `apps/web/src/app/api/crm/reports/export/route.ts`
- Create: `apps/web/src/lib/reports/management.ts`
- Create: `apps/web/src/app/(crm)/crm/reports/page.tsx`
- Modify: `apps/web/src/app/(crm)/crm/CrmLayoutClient.tsx`
- Test: `apps/web/src/__tests__/management-reports.test.ts`

- [ ] Write RED fixture tests with exact KPI formulas and cash-versus-lesson-debit separation.
- [ ] Implement date presets and branch/course/group/teacher filters.
- [ ] Calculate student, group, lesson, attendance, finance, payroll and debt KPIs from authoritative rows.
- [ ] Add group, teacher, attendance and debt tables with required sorting and navigation links; label group capacity as current capacity.
- [ ] Add organization-scoped attendance, debt and payroll CSV exports with BOM and no internal auth IDs/secrets.
- [ ] Add “Отчёты” to CRM navigation and run focused tests green.
- [ ] Commit as `feat(reports): add operational management analytics`.

### Task 7: Add compact dashboard finance signals

**Files:**
- Modify: `apps/web/src/app/api/crm/dashboard/route.ts`
- Modify: `apps/web/src/app/(crm)/crm/page.tsx`
- Test: `apps/web/src/__tests__/dashboard-operational-data.test.ts`

- [ ] Add RED assertions for today planned/completed/remaining lessons, current parent debt and current-month payroll accrued.
- [ ] Extend the dashboard API with exact scoped aggregates.
- [ ] Add compact cards and links to schedule, debt and payroll without duplicating Reports.
- [ ] Run focused tests green.

### Task 8: Document cutover and refund semantics

**Files:**
- Create: `docs/deployment/finance-cutover.md`

- [ ] Document the ten-step disabled-by-default cutover checklist and explicit payment/opening balance choice.
- [ ] State that historical completed lessons are never processed in background and reconciliation is explicit per lesson.
- [ ] State that the current AlfaBank/product contract supports one full refund per payment, not partial refunds.
- [ ] Include deploy commands, rollback cautions and verification queries.

### Task 9: E2E and responsive evidence

**Files:**
- Create: `apps/web/e2e/finance-reconciliation-reports.spec.ts`
- Create: `docs/media/finance-reconciliation/` screenshots

- [ ] Mock only organization-scoped API boundaries with synthetic data and implement the 15-step admin journey from cutover through CSV.
- [ ] Run at 1366×768 and 1280×800 and verify no horizontal overflow.
- [ ] Re-run teacher and parent 390×844 smoke checks without changing demo or parent-access logic.
- [ ] Inspect every screenshot for phones, emails, tokens, UUIDs and child personal data.
- [ ] Commit as `test(finance): verify reconciliation and management reports`.

### Task 10: Full verification and publication

**Files:**
- Review all changed files against this plan and the original specification.

- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db supabase/tests/finance_lifecycle.test.sql`.
- [ ] Run `npm run lint`.
- [ ] Run full unit tests and separately record the unchanged `parent-access.test.ts` baseline if still failing.
- [ ] Run `npm --workspace apps/web run build`.
- [ ] Run `npm --workspace apps/web run test:e2e`.
- [ ] Run `git diff --check` and inspect the final diff for unrelated payment/MAX/parent/demo changes.
- [ ] Push `codex/finance-reconciliation-management-reports` without merging `main`.
