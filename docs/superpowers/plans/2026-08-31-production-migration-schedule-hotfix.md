# Production Migration And Schedule Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely remove legacy payment history, fix recurring group schedule edits without weakening real conflict detection, and deploy the verified forward-only migrations to production with preservation evidence.

**Architecture:** Keep application and database changes forward-only. A dedicated maintenance migration removes only payment-derived rows in FK-safe order, reconciles account balances and invoice statuses, and records aggregate audit evidence; a second migration replaces the recurring-schedule RPC so generated sessions from the edited group are not treated as external conflicts while teacher/room collisions from other groups remain blocked. Regression evidence covers a fresh database, a production-style upgrade, API error mapping, and before/after entity counts.

**Tech Stack:** PostgreSQL 15, Supabase migrations and pgTAP, Next.js 16 App Router, TypeScript, Zod, Vitest, Docker Compose, SSH/nginx.

---

### Task 1: Reproduce and lock down the schedule defect

**Files:**
- Create: `supabase/tests/group_schedule_edit_conflicts.test.sql`
- Modify: `apps/web/src/app/api/crm/schedule/route.ts`
- Test: `apps/web/src/__tests__/schedule-operations.test.ts`

- [ ] Add fixtures for one active group with an existing Saturday 15:00 rule, a protected future session for that same group, and a second group sharing teacher/room.
- [ ] Assert that replacing the edited group rule with Saturday 12:00 succeeds and persists after a new query.
- [ ] Assert that the remaining same-group protected session does not create a self-conflict.
- [ ] Assert that an overlapping second group still raises a conflict.
- [ ] Assert the API maps known schedule conflict errors to a stable Russian message and does not expose raw PostgreSQL text.
- [ ] Run the focused SQL/Vitest tests and capture the pre-fix failure.

### Task 2: Add a forward-only schedule migration

**Files:**
- Create: `supabase/migrations/20260831000002_fix_group_schedule_self_conflict.sql`
- Test: `supabase/tests/group_schedule_edit_conflicts.test.sql`

- [ ] Copy the current `replace_group_schedule(uuid,uuid,jsonb,boolean)` definition without changing its authorization, bounds, protected-session deletion policy, or materialization semantics.
- [ ] Exclude `other.group_id = p_group_id` from resource conflict checks, because the RPC has already serialized the target group and the same group's protected sessions are not an external teacher/room collision.
- [ ] Keep teacher and room overlap checks for every other active group.
- [ ] Preserve revokes/grants and run the focused pgTAP test to green.

### Task 3: Add a narrowly scoped payment-history cleanup migration

**Files:**
- Create: `supabase/migrations/20260831000001_clear_legacy_payment_history.sql`
- Create: `supabase/tests/payment_cleanup_preservation.test.sql`
- Create: `scripts/verify-payment-cleanup-upgrade.sh`

- [ ] Enumerate every FK into `payments`/`invoices` and prove no protected operational table cascades from a payment delete.
- [ ] In one transaction, snapshot aggregate before-counts in a maintenance audit table, remove payment/refund ledger rows with the immutable-ledger trigger temporarily disabled, explicitly delete payment events and transactions, then delete payments.
- [ ] Recompute billing account balances from all remaining ledger entries and let/re-run invoice status calculation; retain invoices, discounts and public links unless they are payment-instance data.
- [ ] Restore the immutable-ledger trigger and store after-counts plus removed-row counts.
- [ ] Add a production-style upgrade harness that stops immediately before the new migration, inserts isolated payment and operational fixtures, applies the cleanup, and asserts payments are gone while students, guardians, groups, rules, sessions and enrollments are unchanged.
- [ ] Run the upgrade harness and the fresh-chain pgTAP suite.

### Task 4: Verify migration history and application quality

**Files:**
- Modify only files from Tasks 1–3 and this plan.

- [ ] Run `git diff --check`.
- [ ] Run `supabase db reset` to prove a clean database reaches the newest migration.
- [ ] Run `supabase test db` and record exact pgTAP totals.
- [ ] Run focused Vitest, full `npm --workspace apps/web run test`, `npm run lint`, and `npm --workspace apps/web run build`.
- [ ] Review the final diff for unrelated changes and confirm no student, guardian, enrollment, group or schedule delete is reachable from cleanup SQL.

### Task 5: Commit, publish and advance the production branch

**Files:**
- No additional source files.

- [ ] Commit the isolated hotfix on `codex/production-migration-schedule-hotfix` and push it.
- [ ] Fetch `origin/main`; require the feature branch to remain a fast-forward descendant.
- [ ] Fast-forward local `main` and `origin/main` only after all verification passes; do not force or synthesize a merge commit.
- [ ] Record feature HEAD and production-branch HEAD.

### Task 6: Back up, migrate and smoke-test production

**Files:**
- No repository changes during deployment.

- [ ] Connect with the configured EdCRM SSH identity, verify `/opt/edcrm` is clean and on the production branch, and record Git/migration heads.
- [ ] Create a custom-format PostgreSQL backup plus checksum and metadata under `/opt/backups` before applying the destructive migration.
- [ ] Query and save counts for guardians, students, groups, enrollments, schedule rules, lesson sessions, invoices, payments, payment events, payment transactions and payment-linked ledger rows.
- [ ] Pull `main` with `--ff-only`; apply only pending migrations through the repository's current self-hosted Supabase procedure, without reset or replay.
- [ ] Rebuild/restart with `docker compose --env-file .env.production -f docker-compose.prod.yml`, then verify container state, `/api/health`, full `/`, full `/login`, CRM route and nginx errors.
- [ ] Re-run all counts and assert only payment-history rows/payment-derived balances changed.
- [ ] Locate the intended Saturday 15:00 group, save Saturday 12:00 through the atomic schedule RPC only when the target is unambiguous and conflict-free, reload the rules/sessions, and verify a deliberately conflicting transaction is rejected and rolled back.
