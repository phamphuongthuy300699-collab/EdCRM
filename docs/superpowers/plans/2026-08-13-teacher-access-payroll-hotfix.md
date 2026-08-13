# Teacher Access Payroll Hotfix Implementation Plan

> **For agentic workers:** Execute this plan in small test-first increments and keep each commit independently reviewable.

**Goal:** Restore staff editing, support fixed-per-lesson teacher pay, make staff/group identity handling predictable, and constrain generated schedules to the group lifetime without weakening the existing security boundary.

**Architecture:** Keep staff profile and finance writes as two explicit API operations. Extend the existing snapshot-based payroll schema and completion transaction rather than introducing a second calculation path. Resolve group teachers from the organization membership list, and enforce schedule date bounds in the database function that owns schedule replacement.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, Supabase/PostgreSQL PL/pgSQL, pgTAP, Vitest, Playwright.

---

## Scope guardrails

- Base commit: `015d32d41b02071a2243e6ff07cb5f21ed129eca`.
- Branch: `codex/teacher-access-payroll-hotfix`.
- Do not change parent access, payments, MAX, invoices, or demo behavior.
- Do not repair or disable the pre-existing `parent-access.test.ts` failure.
- Do not manipulate `auth.users` manually or attempt an unsafe legacy profile re-key.
- Preserve completed, moved, cancelled, extra, trial, and makeup lessons during schedule rebuilds.

## Task 1: Lock staff API contracts with unit tests

**Files:**

- Create: `apps/web/src/features/staff/payloads.ts`
- Create: `apps/web/src/__tests__/staff-payloads.test.ts`
- Modify: `apps/web/src/app/(crm)/crm/settings/page.tsx`

1. Write failing tests proving the profile payload contains only `organizationId`, `userId`, `email`, `fullName`, `phone`, `role`, `specialty`, `publicBio`, `internalComment`, `avatarUrl`, `showOnSite`, and `sortOrder`.
2. Write failing tests proving teacher finance data becomes `{ teacherId, mode, rate, effectiveFrom }` and is absent for non-teachers or blank rates.
3. Implement narrow payload builders and use them from `saveStaff`.
4. Save the profile first. If the finance write fails, retain the saved profile result and show a precise partial-success message.
5. Run `npm --workspace apps/web run test -- staff-payloads.test.ts staff-settings.test.ts`.

## Task 2: Extend payroll snapshots to two modes

**Files:**

- Create: `supabase/migrations/20260811000004_teacher_pay_modes_and_schedule_bounds.sql`
- Modify: `supabase/tests/finance_lifecycle.test.sql`
- Modify: `apps/web/src/app/api/crm/finance/teacher-rates/route.ts`
- Modify: `apps/web/src/app/api/crm/staff/list/route.ts`

1. Add failing pgTAP assertions for `per_attendee` and `per_lesson`, including a completed lesson with zero attendees and no accrual for non-completed states.
2. Add `pay_mode` and a generic rate value to rules while retaining and backfilling `rate_per_attendee` for rolling compatibility.
3. Add `pay_mode` to payroll entries; leave historical `rate_snapshot` and `amount` intact.
4. Replace the rate RPC with a mode-aware signature and retain a compatibility wrapper for old callers.
5. Update completion and missing-rate repair so only unresolved accrued snapshots can be repaired; fixed lessons use the fixed rate and attendee-based lessons multiply.
6. Update the API schema and staff list response.
7. Run the finance pgTAP suite after a local database reset.

## Task 3: Improve staff pay and access UX

**Files:**

- Modify: `apps/web/src/app/(crm)/crm/settings/page.tsx`
- Modify: `apps/web/src/app/api/crm/staff/list/route.ts`
- Modify: `apps/web/src/__tests__/staff-settings.test.ts`

1. Add failing UI-contract tests for the two pay modes and account-state controls.
2. Compute `hasAuthAccount` server-side by comparing organization memberships with Auth Admin users; expose only the boolean.
3. Add a segmented pay-mode control with contextual rate labels.
4. Track reset loading, errors, success, and temporary passwords per staff card.
5. For legacy profiles without Auth ownership, display an explicit legacy marker and a `Создать доступ` explanation. Defer automatic re-key unless the FK audit proves it transactional and safe.
6. Verify reset remains limited by the existing active-membership, Auth-owner, exclusive-scope, audit, and rate-limit checks.

## Task 4: Use one canonical teacher directory in groups

**Files:**

- Modify: `apps/web/src/app/(crm)/crm/groups/page.tsx`
- Modify: `apps/web/src/app/(crm)/crm/settings/page.tsx`
- Add or modify focused Vitest contract tests.

1. Add failing tests showing group labels resolve by `teacher_id` from active teacher memberships and fall back to embedded profile data only when needed.
2. Replace the direct arbitrary `profiles` browser query in `/crm/groups` with `/api/crm/staff`.
3. Filter selectors to active teachers and use the same resolver for cards, modal summaries, and save results.
4. Keep group save errors inside the modal; on success show counts returned by `save_group_with_schedule`.

## Task 5: Bound schedule generation in the owning transaction

**Files:**

- Modify: `supabase/migrations/20260811000004_teacher_pay_modes_and_schedule_bounds.sql`
- Modify: schedule pgTAP tests under `supabase/tests/`
- Modify API-side materialization only if it bypasses `replace_group_schedule`.

1. Add failing pgTAP cases for a future `starts_on`, an early `ends_on`, and rebuild preservation of operational exceptions.
2. Generate from `greatest(current_date, starts_on)` through `least(current_date + 12 weeks, ends_on)`.
3. Delete only safe future planned regular rule-owned sessions with no reschedule origin.
4. Return created/deleted/rule counts unchanged so the CRM can display them.
5. Run the schedule pgTAP suite.

## Task 6: Make payroll basis visible everywhere

**Files:**

- Modify: `apps/web/src/app/api/crm/finance/route.ts`
- Modify: `apps/web/src/app/api/teacher/payroll/route.ts`
- Modify: `apps/web/src/app/api/crm/reports/export/route.ts`
- Modify: `apps/web/src/app/(crm)/crm/finance/page.tsx`
- Modify: `apps/web/src/app/teacher/page.tsx`
- Modify focused finance/report tests.

1. Add failing tests for snapshot fields in the admin, teacher, and CSV projections.
2. Select `pay_mode` from payroll snapshots.
3. Render fixed lessons as a fixed rate and attendee mode as attendee count × rate; always use persisted `amount` for totals.
4. Add the pay basis to payroll CSV without recalculating historical amounts.

## Task 7: Verification, evidence, and publication

1. Run `supabase db reset` and the required finance/security/schedule pgTAP suites.
2. Run lint, focused and full Vitest (excluding only the proven baseline parent-access test in the clean-base comparison), production build, and full Playwright E2E.
3. Audit the local FK graph and record why legacy automatic provisioning is implemented or deferred.
4. Exercise the production-like admin flow with a normal test Auth account and record the result for `Федоренко Сергей` without exposing credentials.
5. Capture sanitized screenshots required by the specification.
6. Review `git diff` for forbidden areas and accidental formatting.
7. Commit by concern, push `codex/teacher-access-payroll-hotfix`, and do not merge to `main`.
