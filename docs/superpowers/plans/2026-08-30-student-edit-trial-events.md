# Student Editing and Trial Events Implementation Plan

> **Branch:** `codex/student-edit-trial-events`
> **Base:** `d822ab86e72a9798927640174b21e9f44f883c35`
> **Scope guard:** no merge, no deploy, no billing/payroll/attendance/parent-access behavior changes.

**Goal:** Make canonical student details editable and introduce a tenant-safe, transactional trial appointment domain that works for leads and existing students, supports standalone and lesson-attached trials, appears in CRM and teacher workflows, and never creates enrollment, billing, attendance, payroll, homework, material-access, or parent-access side effects.

**Architecture:** Keep student identity edits in a narrow authenticated PATCH route. Store trial containers and participants in new normalized tables, with all creation/capacity/conflict/history/lifecycle invariants enforced by service-role-only PostgreSQL RPCs. Reuse the existing schedule API and shared `LessonConductPanel` as read-model integration points; use a shared trial dialog and participant editor in leads, students, schedule, CRM lesson, and teacher screens.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript, Zod 4, Supabase/PostgreSQL, pgTAP, Vitest, Playwright.

---

## Task 1: Lock down contracts with failing focused tests

**Files:**
- Create: `apps/web/src/features/students/contracts.ts`
- Create: `apps/web/src/features/trials/contracts.ts`
- Create: `apps/web/src/features/trials/domain.ts`
- Test: `apps/web/src/__tests__/student-edit-trial-contracts.test.ts`

1. Add RED tests for a strict student PATCH payload: trimmed non-empty `fullName`, nullable ISO `birthDate`, nullable trimmed `notes`, database-shaped legacy UUID path IDs, and rejection of unknown fields.
2. Add RED tests for trial creation modes, XOR lead/student subjects, legacy database UUID acceptance, malformed ID rejection, result/status contracts, and exact half-open overlap semantics (`start < otherEnd && end > otherStart`, adjacency allowed).
3. Run the focused test and confirm it fails because the contracts do not exist.
4. Implement only the schemas, labels, DTO types, date/overlap helpers, and participant dedupe-key helpers required by the tests.
5. Re-run the focused test to GREEN.

## Task 2: Add canonical student editing API and honest student UI

**Files:**
- Create: `apps/web/src/app/api/crm/students/[studentId]/route.ts`
- Modify: `apps/web/src/app/(crm)/crm/students/page.tsx`
- Test: `apps/web/src/__tests__/student-edit-api.test.ts`
- Test: `apps/web/src/__tests__/student-edit-ui.test.ts`

1. Add RED API contract tests proving owner/admin/manager auth, strict validation, organization-scoped update, deleted-row exclusion, canonical response fields, and no status/group mutation in this route.
2. Implement `PATCH /api/crm/students/[studentId]` using awaited dynamic params, `databaseUuidSchema`, `requireCrmStaff(crmMutationRoles)`, a service client, and an organization-scoped update of only `full_name`, `birth_date`, `notes`.
3. Add RED UI tests proving production mapping retains raw `birthDate`/`notes`, age is absent rather than invented when birth date is absent, and row actions are real (`open`, conditional `tel:`, trial assignment).
4. Simplify the production student view model and table: remove fabricated payment/project/homework columns and fallback values; show canonical name/age, active group, primary guardian/contact, lifecycle status, and real actions.
5. Add an edit form to the existing student drawer, save through the PATCH route, keep status and enrollment on their existing endpoints, preserve all existing guardian and parent-access controls, and load the student's interaction history through `/api/crm/interactions?studentId=...`.
6. Re-run both focused test files to GREEN.

## Task 3: Add the trial database domain and transactional invariants

**Files:**
- Create: `supabase/migrations/20260830000001_trial_events_and_participants.sql`
- Create: `supabase/tests/trial_events.test.sql`
- Modify: `apps/web/src/__tests__/database-migrations.test.ts`

1. Write a RED pgTAP test describing:
   - table/constraint/index/RLS/privilege shape;
   - tenant validation for event, subject, teacher, branch, room, and attached session;
   - one attached event per lesson session and participant XOR/uniqueness;
   - whole-batch creation and one interaction per subject;
   - lead transition `new|contacted|lost -> trial_scheduled` without regressing `converted`;
   - attached capacity as distinct active enrollment + scheduled makeup + non-cancelled trials;
   - concurrent safety lock contract and all-or-nothing overflow rejection;
   - standalone teacher/room overlap against planned/live lessons and active standalone trials, with adjacent slots allowed;
   - room capacity only when `rooms.capacity` is non-null;
   - result/status update plus interaction in one transaction;
   - cancellation releasing a seat;
   - no enrollment, invoice, payment, billing account, attendance, payroll, homework, material, or parent access rows.
2. Run the focused pgTAP test and confirm RED because the tables/RPCs do not exist.
3. Create `trial_events` and `trial_participants` with explicit checks, partial unique indexes, timestamps, tenant FKs/triggers where needed, RLS enabled, and no browser mutation grants.
4. Implement `crm_create_trial_event(...)` as `security definer set search_path=public`: validate active actor/subjects/resources; lock attached sessions or deterministic standalone resource advisory keys; reuse the single attached container; recompute distinct capacity under lock; reject conflicts; insert the whole participant batch; write scheduled-trial interactions; update lead lifecycle intentionally; return event and participant IDs.
5. Implement `crm_update_trial_event(...)` for standalone rescheduling/resource edits and whole-event soft cancellation, reusing the same locks/conflict checks and writing cancellation interactions.
6. Implement `crm_record_trial_participant_result(...)`: enforce admin or owning teacher access, lock the participant/event/session, re-check capacity when restoring a cancelled participant, persist status/result/comment/completed actor, and write a subject interaction atomically.
7. Revoke RPC execution from `public`, `anon`, and `authenticated`; grant only `service_role`.
8. Reset local Supabase, run the focused pgTAP file, inspect actual catalog constraints/function definitions/privileges, and iterate to GREEN.

## Task 4: Add tenant-scoped trial APIs and option/read models

**Files:**
- Create: `apps/web/src/app/api/crm/trials/route.ts`
- Create: `apps/web/src/app/api/crm/trials/options/route.ts`
- Create: `apps/web/src/app/api/crm/trials/[trialId]/route.ts`
- Create: `apps/web/src/app/api/crm/trials/participants/[participantId]/route.ts`
- Test: `apps/web/src/__tests__/trial-api.test.ts`

1. Add RED tests for role boundaries, strict Zod validation, organization ID derived only from auth, legacy DB UUID support, use of the transactional RPCs, sanitized conflict/capacity errors, and teacher inability to create or edit another teacher's event.
2. Implement admin-only create/list/options/event-edit routes and a staff participant route that delegates ownership enforcement to the RPC.
3. Return only live/non-deleted leads and students in the subject picker, active teacher memberships, active non-archived branches/rooms, and eligible planned/live ordinary sessions.
4. Map known database error codes to stable safe API codes/messages (`TRIAL_CAPACITY_EXCEEDED`, `TRIAL_SLOT_CONFLICT`, `TRIAL_SUBJECT_DUPLICATE`, `TRIAL_FORBIDDEN`) without exposing SQL internals.
5. Re-run the focused API tests to GREEN.

## Task 5: Build the shared trial assignment and participant UI

**Files:**
- Create: `apps/web/src/features/trials/TrialSubjectPicker.tsx`
- Create: `apps/web/src/features/trials/TrialParticipantList.tsx`
- Create: `apps/web/src/features/trials/TrialDialog.tsx`
- Modify: `apps/web/src/app/(crm)/crm/students/page.tsx`
- Modify: `apps/web/src/app/(crm)/crm/leads/page.tsx`
- Test: `apps/web/src/__tests__/trial-ui.test.tsx`

1. Add RED component tests for multi-subject selection/removal, lead/student preselection, standalone versus existing-lesson mode, accessible labels/loading/errors, whole-batch submit, and capacity/conflict messages.
2. Implement a searchable subject picker that identifies lead versus student and prevents duplicate chips.
3. Implement the shared dialog: mode selection, eligible lesson choice or standalone date/time/teacher/branch/room fields, participant summary, cancel/save controls, and API error handling.
4. Replace the lead row's status-only “Пробное” action with the dialog preselected to that lead; after save refresh lead state/history.
5. Add “Записать на пробное” to student rows/drawer preselected to that student; after save refresh interaction history.
6. Implement `TrialParticipantList` with separate operational status, commercial result, comment, save/loading/error states; it must never touch regular attendance controls.
7. Re-run focused UI tests to GREEN.

## Task 6: Integrate trial read models into schedule and shared lesson conduct

**Files:**
- Modify: `apps/web/src/app/api/crm/schedule/route.ts`
- Modify: `apps/web/src/app/api/crm/schedule/session/[sessionId]/route.ts`
- Modify: `apps/web/src/features/scheduling/ScheduleWorkspace.tsx`
- Modify: `apps/web/src/features/scheduling/LessonConductPanel.tsx`
- Modify: `apps/web/src/app/(crm)/crm/lessons/[sessionId]/page.tsx`
- Modify: `apps/web/src/app/teacher/page.tsx`
- Test: `apps/web/src/__tests__/trial-schedule-integration.test.tsx`

1. Add RED tests proving ordinary sessions retain `studentCount` and gain a separate `trialParticipantCount`, standalone trials are separate read-model records, teachers receive only their own trial data, and lesson detail returns trial participants separately from attendance rows.
2. Extend schedule GET with tenant- and role-scoped trial queries and filters. Return normal capacity text inputs plus `standaloneTrials`; do not materialize standalone trials into `lesson_sessions`.
3. Render ordinary cards as “N постоянных + M пробных / capacity” and standalone trial cards as a distinct visual type with participants, teacher, branch, room, time, edit/cancel actions for admins, and no regular journal link.
4. Remove “trial” from the legacy generic “Добавить занятие” create choice and expose the shared dedicated “Записать на пробное” flow instead; existing stored legacy lesson-session kinds remain readable and untouched.
5. Add `trialParticipants` to lesson detail and render `TrialParticipantList` inside the shared `LessonConductPanel`, visually separate from `AttendanceRoster`.
6. Make the teacher page display its own standalone trial appointments and allow participant outcome updates; admin preview remains read-only. Attached trial participants appear through the same shared lesson panel.
7. Re-run focused schedule/teacher integration tests to GREEN.

## Task 7: Add real acceptance coverage

**Files:**
- Create: `apps/web/e2e/student-edit-trial-events.spec.ts`
- Extend: `supabase/tests/trial_events.test.sql`

1. Add a Playwright flow for canonical student edit persistence and trial-dialog UX using deterministic API interception only for presentation wiring.
2. Treat pgTAP as the real local-Supabase business/security evidence: create two tenants, mixed lead/student batch, attach and standalone modes, capacity/makeup/enrollment dedupe, conflicts, cancellation/retry, teacher ownership, interactions, and zero side effects in prohibited domains.
3. Run focused Playwright and focused pgTAP; record exact counts.

## Task 8: Full verification, independent review, and branch delivery

**Files:** all files changed above only.

1. Run `git diff --check`.
2. Run `supabase db reset` and every pgTAP file with `supabase test db`.
3. Run focused Vitest files, then `npm --workspace apps/web run test`.
4. Run `npm run lint` and `npm --workspace apps/web run build`.
5. Run focused Playwright, then full `npm --workspace apps/web run test:e2e`; report any true baseline failure separately only if reproduced on base.
6. Request an independent final code review focused on tenant isolation, transactional capacity/conflicts, no prohibited side effects, and UI integration; address only in-scope findings and re-run affected checks.
7. Inspect `git diff --stat`, `git status`, and the final commit diff; create focused commits without unrelated formatting/refactors.
8. Push `codex/student-edit-trial-events` to `origin`. Do not merge and do not deploy.
