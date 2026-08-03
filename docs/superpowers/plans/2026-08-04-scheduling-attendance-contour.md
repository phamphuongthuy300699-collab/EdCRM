# Scheduling, Attendance And Makeups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one operational contour for actual lessons, reschedules, cancellations, attendance, makeups, parent visibility, teacher work and MAX notifications.

**Architecture:** Keep recurring `group_schedule_rules` as templates and make `lesson_sessions` the source of truth for concrete dates. Store absence meaning on attendance and store makeup lifecycle in a dedicated table linking the missed attendance to a target session. Route state-changing operations through one authenticated scheduling API that also expands group/student audiences into guardian-specific outbox rows.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Supabase/Postgres/RLS, Vitest, Playwright, MAX Bot API.

---

### Task 1: Domain contracts and formatting

**Files:**
- Create: `apps/web/src/features/scheduling/domain.ts`
- Create: `apps/web/src/__tests__/scheduling-domain.test.ts`

- [ ] Write failing tests for status labels, next-session ordering and payload formatting.
- [ ] Run `npm --workspace apps/web run test -- --run src/__tests__/scheduling-domain.test.ts` and confirm missing-module failure.
- [ ] Implement explicit unions:

```ts
export type AttendanceStatus = "unmarked" | "present" | "late" | "absent_excused" | "absent_unexcused";
export type MakeupStatus = "requested" | "approved" | "scheduled" | "completed" | "cancelled";
export type ScheduleNotificationKey = "lesson_rescheduled" | "lesson_cancelled" | "makeup_scheduled" | "attendance_absent";
```

- [ ] Re-run the focused test and confirm PASS.

### Task 2: Database model and RLS

**Files:**
- Create: `supabase/migrations/20260804000001_scheduling_attendance_makeups.sql`
- Modify: `apps/web/src/shared/db/types.ts`
- Test: `apps/web/src/__tests__/scheduling-migration.test.ts`

- [ ] Write a migration contract test asserting reschedule links, attendance status, makeup table, outbox session/student fields, indexes and RLS.
- [ ] Run the focused test and confirm RED.
- [ ] Add `session_kind`, `schedule_rule_id`, `rescheduled_from_session_id`, reasons and notification metadata to sessions; replace the date-only unique constraint with `(group_id, starts_at)`.
- [ ] Add `attendance_status`, `absence_reason`, `marked_by`, `marked_at` while preserving `is_present` for compatibility.
- [ ] Create `makeup_assignments(source_attendance_id, student_id, target_session_id, status, requested_by_guardian_id, approved_by, notes)`.
- [ ] Extend outbox with `student_id` and `lesson_session_id`.
- [ ] Add select/write RLS for staff, assigned teachers and linked guardians.
- [ ] Re-run migration tests and confirm PASS.

### Task 3: Scheduling operations and notification audience

**Files:**
- Create: `apps/web/src/features/scheduling/server.ts`
- Create: `apps/web/src/app/api/crm/schedule/route.ts`
- Create: `apps/web/src/__tests__/schedule-api.test.ts`

- [ ] Write failing tests for `materialize`, `reschedule`, `cancel`, `request_makeup`, `schedule_makeup` and guardian outbox expansion.
- [ ] Run the focused test and confirm RED.
- [ ] Validate actions with Zod and `requireCrmStaff`; permit teachers only for attendance on owned groups.
- [ ] Implement materialization without duplicating `(group, starts_at)` sessions.
- [ ] Implement reschedule as old=`moved` plus cloned planned session with `rescheduled_from_session_id`.
- [ ] Implement cancellation and makeup lifecycle with organization scoping.
- [ ] Resolve recipients through enrollments → student_guardians and insert one outbox row per guardian.
- [ ] Re-run focused tests and confirm PASS.

### Task 4: Shared operational components

**Files:**
- Create: `apps/web/src/features/scheduling/ScheduleWorkspace.tsx`
- Create: `apps/web/src/features/scheduling/AttendanceRoster.tsx`
- Test: `apps/web/src/__tests__/scheduling-components.test.tsx`

- [ ] Write RED tests for week navigation, status text, reschedule/cancel actions, unmarked attendance default and makeup badge.
- [ ] Implement compact responsive schedule cards and one roster shared by admin and teacher.
- [ ] Ensure statuses have text and icon, controls have labels, and mobile layout does not depend on tables.
- [ ] Re-run component tests and confirm PASS.

### Task 5: Administrator schedule

**Files:**
- Modify: `apps/web/src/app/(crm)/crm/lessons/page.tsx`
- Modify: `apps/web/src/app/(crm)/crm/lessons/[sessionId]/page.tsx`
- Modify: `apps/web/src/app/(crm)/crm/groups/page.tsx`

- [ ] Replace the historical table-only view with current-week operational workspace.
- [ ] Add materialize, create extra lesson, reschedule and cancel flows through `/api/crm/schedule`.
- [ ] Explain that rule edits affect future materialization, not past/concrete sessions.
- [ ] Use the shared attendance roster on session detail and expose pending makeup candidates.

### Task 6: Teacher portal

**Files:**
- Modify: `apps/web/src/app/teacher/page.tsx`

- [ ] Load actual sessions for owned groups instead of an arbitrary group/date as the primary entry.
- [ ] Keep start/end controls on the selected concrete session.
- [ ] Use the shared roster, show makeup guests and save explicit attendance statuses.
- [ ] Keep current demo behavior isolated and do not broaden teacher access.

### Task 7: Parent portal

**Files:**
- Modify: `apps/web/src/app/parent/page.tsx`
- Create: `apps/web/src/app/api/parent/schedule/route.ts`
- Test: `apps/web/src/__tests__/parent-schedule.test.ts`

- [ ] Write RED tests proving linked guardians see only their children’s sessions/makeups.
- [ ] Query concrete upcoming sessions and recent attendance through a guardian-scoped server route.
- [ ] Render cancellations/reschedules, absence reasons and makeup lifecycle.
- [ ] Add “Запросить отработку” only for eligible excused absences without an open request.

### Task 8: MAX schedule notifications and self-service

**Files:**
- Modify: `apps/web/src/lib/bots/max/client.ts`
- Modify: `apps/web/src/app/api/jobs/notifications/process/route.ts`
- Modify: `apps/web/src/app/api/bots/max/webhook/route.ts`
- Modify: `apps/web/src/__tests__/max-bot.test.ts`
- Modify: `apps/web/src/__tests__/max-webhook-route.test.ts`

- [ ] Write RED tests for schedule message templates and “Расписание” menu action.
- [ ] Dispatch worker messages by `template_key`; keep invoice builder unchanged.
- [ ] Add MAX menu button and guardian-scoped next-session response.
- [ ] Never log tokens, child data or external IDs in failure responses.
- [ ] Re-run MAX tests and confirm PASS.

### Task 9: Verification

- [ ] Run `npm run lint`.
- [ ] Run `npm --workspace apps/web run test` and separately document any baseline-only failure.
- [ ] Run scheduling/MAX/parent focused tests.
- [ ] Run `npm --workspace apps/web run test:e2e -- scheduling-contour.spec.ts --project=chromium` after browser-capture permission or with the approved capture tool.
- [ ] Run `npm --workspace apps/web run build`.
- [ ] Inspect final diff for unrelated payment, parent-access and demo changes.
