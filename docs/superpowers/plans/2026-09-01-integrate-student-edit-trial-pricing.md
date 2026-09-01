# Student Edit, Trial Events, and Personal Pricing Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate commit `ba699c7` into production `main` without losing the personal lesson price, payment cleanup, or group schedule fixes already present in `0748221`.

**Architecture:** Apply the trial/student-edit commit on a branch based on current `origin/main`, resolve overlapping student and schedule files explicitly, and add an integration contract covering both feature sets. Keep the existing dedicated trial model and API, the simplified student list/drawer editor, and `students.lesson_price` as the billing source.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, Supabase/PostgreSQL migrations, Vitest, pgTAP, Playwright, Docker Compose.

---

### Task 1: Establish the integration contract

**Files:**
- Create: `apps/web/src/__tests__/student-trial-pricing-integration.test.ts`
- Inspect: `apps/web/src/app/(crm)/crm/students/page.tsx`
- Inspect: `apps/web/src/app/api/crm/students/[studentId]/route.ts`
- Inspect: `apps/web/src/features/trials/TrialDialog.tsx`

- [ ] Write a source contract requiring the student list to omit placeholder payment/progress actions, expose the working drawer editor and trial dialog, and retain `lesson_price` in create/edit flows.
- [ ] Run the focused Vitest file on `0748221`; expect failure because the drawer editor/trial model is absent.
- [ ] Apply `ba699c7` and use the failing assertions to drive conflict resolution.

### Task 2: Resolve application conflicts

**Files:**
- Modify: `apps/web/src/app/(crm)/crm/students/page.tsx`
- Modify: `apps/web/src/app/api/crm/students/manage/route.ts`
- Modify: `apps/web/src/app/api/crm/schedule/route.ts`
- Modify: any additional files reported by Git conflicts

- [ ] Preserve the simplified table, working `tel:` action, trial action, details drawer editor, and destructive actions inside the drawer from `ba699c7`.
- [ ] Preserve required positive `lessonPrice` in all student creation flows and editable `lesson_price` in the drawer.
- [ ] Preserve schedule validation/error mapping and the self-conflict-safe RPC contract from current `main` while adding dedicated trial endpoints and UI.
- [ ] Run the focused integration and existing student/trial/pricing unit tests; expect all to pass.

### Task 3: Verify migrations in both deployment states

**Files:**
- Keep: `supabase/migrations/20260830000001_trial_events_and_participants.sql`
- Keep: `supabase/migrations/20260831000001_clear_legacy_payment_history.sql`
- Keep: `supabase/migrations/20260831000002_fix_group_schedule_self_conflict.sql`
- Keep: `supabase/migrations/20260831000003_student_lesson_pricing.sql`
- Create: `supabase/migrations/20260901000001_consolidate_trial_group_schedule.sql`
- Test: `supabase/tests/trial_events.test.sql`
- Test: `supabase/tests/student_lesson_pricing.test.sql`

- [ ] Run a fresh `supabase db reset --no-seed`; expect all migrations in filename order to succeed.
- [ ] Reset to `20260831000003`, apply the previously undeployed trial migration followed by the consolidation migration against that schema in a rollback-safe local copy, and run trial plus schedule pgTAP evidence.
- [ ] Verify production applies both pending files in one transaction. The consolidation definition must remain last because `20260831000002` is already present on production but sorts after the original trial migration on a fresh database.

### Task 4: Full verification and Git integration

- [ ] Run `git diff --check`.
- [ ] Run focused unit tests, then the complete Vitest suite.
- [ ] Run all pgTAP tests and trial concurrency evidence.
- [ ] Run lint and production build.
- [ ] Run focused student/trial Playwright, then full Playwright; remove generated screenshot artifacts.
- [ ] Review the complete diff against both parents and confirm no parent/payment/MAX regression outside the required trial notification integration.
- [ ] Commit, push the integration branch, fast-forward `main`, push `main`, and verify clean identical SHAs.

### Task 5: Production rollout

- [ ] Verify `/opt/edcrm` is clean and on the old production SHA.
- [ ] Record pre-deploy counts and create verified PostgreSQL/media backup with SHA256.
- [ ] Pull `main`, apply `20260830000001_trial_events_and_participants.sql` and `20260901000001_consolidate_trial_group_schedule.sql` in one transaction, and verify trial schema objects plus the final schedule function.
- [ ] Build and restart `edcrm-web` with the existing Docker Compose workflow.
- [ ] Confirm healthy service, full GETs, protected API behavior, student drawer/trial UI assets, rollback-only business flows, unchanged key counts, and clean application/nginx logs.
