# Lesson Billing and Teacher Payroll Implementation Plan

> **For Codex:** Follow this plan with test-driven development. Keep the existing parent-access baseline failure unchanged and do not alter demo, MAX delivery, public payment-link, invoice-publication, or payment-status semantics outside the explicitly listed integration points.

**Goal:** Add guardian-owned immutable billing accounts, atomic lesson debits and teacher accruals, and consistent finance projections for CRM, parent, teacher, and student views.

**Architecture:** PostgreSQL is the authority for monetary values and idempotency. Four focused migrations introduce accounts/ledger and group settings, payroll, atomic paid-payment settlement, then extend the existing lesson-session transition transaction. Next.js APIs enforce role-specific projections; compact UI panels consume those APIs without exposing finance internals to teachers or payroll to guardians.

**Tech Stack:** Supabase/PostgreSQL/PLpgSQL/RLS, Next.js App Router, React/TypeScript, Zod, Vitest, Playwright.

---

### Task 1: Lock current behavior with failing finance contracts

**Files:**
- Create: `apps/web/src/__tests__/finance-ledger-contract.test.ts`
- Create: `apps/web/src/__tests__/finance-projections.test.ts`
- Create: `apps/web/e2e/finance-operations.spec.ts`

1. Add contract tests for immutable ledger, signed amounts, unique payment and lesson keys, group billing defaults, billing-contact resolution, rate snapshots, repeated completion, and no historical backfill.
2. Add API/source contracts proving every real `paid` transition calls one settlement RPC and finance projections enforce role ownership.
3. Add a mocked Playwright operational journey and viewport assertions for CRM 1366px, teacher 390px/desktop, and parent 390px.
4. Run focused tests and capture expected failures before implementation.

### Task 2: Add billing accounts, immutable ledger, and group policy

**Files:**
- Create: `supabase/migrations/20260808000001_billing_accounts_ledger.sql`
- Modify: `supabase/migrations/20260807000004_atomic_group_schedule_save.sql` only through a new replacement definition in the new migration
- Modify: `apps/web/src/app/api/crm/schedule/route.ts`
- Modify: `apps/web/src/app/(crm)/crm/groups/page.tsx`

1. Create `billing_accounts`, `billing_ledger_entries`, and `finance_warnings` with numeric checks, immutable update/delete guard, partial unique indexes, useful indexes, timestamps, and RLS.
2. Add disabled-by-default per-group lesson billing settings and include them in `save_group_with_schedule` without changing schedule behavior.
3. Add an admin-only atomic manual adjustment RPC requiring a reason.
4. Expose the settings in the existing group editor, preserving responsive layout and existing form behavior.

### Task 3: Add teacher pay rules and immutable session snapshots

**Files:**
- Create: `supabase/migrations/20260808000002_teacher_payroll.sql`
- Modify: `apps/web/src/app/(crm)/crm/settings/page.tsx`
- Create: `apps/web/src/app/api/crm/finance/teacher-rates/route.ts`

1. Add effective-dated `teacher_pay_rules` and unique per-session `teacher_payroll_entries` with accrued/approved/paid accounting states and RLS.
2. Add privileged RPCs for setting a new effective rate and advancing payroll status without editing historical snapshots.
3. Add the rate field to the existing staff/teacher editor and show its effective date.

### Task 4: Make every real paid transition atomic and idempotent

**Files:**
- Create: `supabase/migrations/20260808000003_payment_settlement.sql`
- Modify: `apps/web/src/lib/payments/alfabank/status-service.ts`
- Create: `apps/web/src/app/api/crm/invoices/settle/route.ts`
- Modify: `apps/web/src/app/(crm)/crm/invoices/page.tsx`
- Modify: `apps/web/src/app/(crm)/crm/students/[studentId]/page.tsx`

1. Add `settle_paid_payment` to lock payment/invoice/account, use canonical `invoice.guardian_id`, record payment event, insert one credit ledger entry, update balance, and mark payment/invoice paid in one transaction.
2. Keep non-paid Alfa statuses on their existing path; route only true `paid` through the settlement RPC.
3. Replace both browser-side manual-paid sequences with the protected API using the same RPC.
4. Add an explicit admin reconciliation RPC that is never run automatically and only creates missing ledger credit for an already paid payment.

### Task 5: Extend lesson completion transaction

**Files:**
- Create: `supabase/migrations/20260808000004_lesson_finance_completion.sql`
- Modify: `apps/web/src/app/api/crm/schedule/route.ts`
- Modify: `apps/web/src/app/api/crm/schedule/session/[sessionId]/route.ts`
- Modify: `apps/web/src/app/(crm)/crm/lessons/[sessionId]/page.tsx`

1. Replace `transition_lesson_session` while retaining locks, permissions, lifecycle, attendance completeness, and makeup completion.
2. Within the same transaction, resolve the explicit billing contact, evaluate status/kind/group policy, prevent makeup double charge, insert idempotent debits, update balances, and create unresolved admin warnings instead of blocking.
3. Snapshot one payroll row from present/late attendees (including makeup) and the effective teacher rate; warn rather than block when missing.
4. Return a safe summary. Show administrative warning counts only to admins; keep teacher completion fast and finance details hidden.
5. Fix session/schedule `studentCount` to unique active enrollments plus scheduled makeup and dashboard active students to `active OR NULL`.

### Task 6: Build role-specific finance projections

**Files:**
- Create: `apps/web/src/app/api/crm/finance/route.ts`
- Create: `apps/web/src/app/(crm)/crm/finance/page.tsx`
- Modify: CRM sidebar/navigation component discovered during implementation
- Create: `apps/web/src/app/api/teacher/payroll/route.ts`
- Modify: existing teacher home/profile page discovered during implementation
- Create: `apps/web/src/app/api/parent/finance/route.ts`
- Modify: `apps/web/src/app/parent/payments/page.tsx`
- Create: `apps/web/src/app/api/crm/students/[studentId]/finance/route.ts`
- Modify: `apps/web/src/app/(crm)/crm/students/[studentId]/page.tsx`

1. Add CRM Finance tabs: Accounts with search and read-only ledger drawer/manual adjustment, Payroll with filters and accounting actions, Problems with missing contact/price/rate warnings.
2. Add read-only own payroll projection to teacher UI.
3. Add guardian-owned account balance/debt and ledger to parent payments, never payroll.
4. Add student-card projection through the explicit billing guardian account, never a separate student wallet.
5. Verify RLS and server role gates: owner/admin/accountant manage; manager reads; teachers only own payroll; guardians only own billing accounts.

### Task 7: Verify end to end and publish branch

**Files:**
- Modify only test snapshots/styles required by the implemented finance screens
- Create screenshots under the existing ignored Playwright artifact directory (do not commit secrets or personal data)

1. Run focused finance tests, lint, all web unit tests, and build.
2. Run Playwright finance journey and capture required desktop/mobile screenshots; inspect for horizontal overflow and sensitive data.
3. Re-run the baseline parent-access test to document it still fails for the same pre-existing static assertion; do not change or exclude it globally.
4. Review diff for unrelated files, payment/MAX/parent-access/demo regressions, and migration ordering.
5. Create logical commits, push `codex/lesson-billing-teacher-payroll`, and report base SHA, tests, baseline exclusions, migrations, changed files, commits, and branch URL without merging main.
