# Operations UX, schedule, and teacher mobile — implementation plan

**Base:** `origin/main` at `b24d2a8`

**Branch:** `codex/operations-ux-schedule-teacher-mobile`

**Guardrails:** keep the canonical `students`, `enrollments`, `groups`, `group_schedule_rules`, `lesson_sessions`, `attendance`, `profiles`, and `org_memberships` entities. Do not change balances, debits, payroll, invoices, payments, Alfa callbacks, MAX delivery, parent access, or demo-only business logic outside the explicitly required production fallbacks.

## 1. Student operations and shared selection

- Add focused domain tests for active/without-group classification and searchable student matching.
- Add an organization-scoped student search endpoint that returns child, guardian, status, and active-group context.
- Add a debounced shared `StudentPicker` supporting exclusions and single/multiple selection.
- Add one transactional enrollment RPC/API for assignment, transfer, and removal; keep create-with-group on the existing atomic RPC.
- Update the Students page metrics, filter, labels, and quick actions.
- Replace concrete-child selectors in group membership, discounts, and invoices; document audited exclusions.

## 2. Responsive CRM dialog primitive

- Add `CrmDialog` with a fixed internal header, scrolling body, sticky footer, 90dvh desktop limit, and 95dvh mobile sheet behavior.
- Migrate student create/detail, group create/edit/member, settings branch/course/group/staff overlays, invoice creation, and schedule change/create overlays.
- Preserve current form state and mutation behavior; do not refactor unrelated screens.

## 3. Dashboard totals

- Add route contract tests proving counts are separate from limited recent lists.
- Query global lead and overdue totals independently from recent-card data.
- Count active students from `students.status='active'` and active students without active enrollments separately.
- Surface the without-group count in the CRM dashboard.

## 4. Operational schedule

- Add tests for today/all defaults, composable filters, and teacher/group grouping.
- Extend the schedule API with organization-scoped teacher, group, branch, room, status, and type filters.
- Rework `ScheduleWorkspace` to default to Today + All lessons and show chronological/grouped lists from `lesson_sessions` only.
- Move schedule change/create overlays to `CrmDialog` and keep mobile filters compact.
- Add a small SQL migration that validates teacher and room overlaps before replacing rules, regardless of `p_rebuild_future`.

## 5. Teacher session lifecycle and attendance

- Add migration/API contract tests for server-only `start_session` and `complete_session` transitions and teacher ownership.
- Add a transactional lifecycle RPC with a clearly marked future-finance boundary but no financial mutations.
- Remove production demo fallbacks, hardcoded schedules, browser session inserts, and browser completion updates from `/teacher`.
- Make `/teacher` mobile-first and load only authenticated teacher sessions from `lesson_sessions`.
- Rebuild `AttendanceRoster` around touch buttons, explicit absence classification, optional reason/comment, bulk present, completion gating, sticky actions, feedback, and submit locks.
- Reuse the same server save/complete actions from the lesson screen.

## 6. Access, verification, and delivery

- Verify the existing staff create/reset/disable and group assignment chain; add a credential-free documented teacher-access test scenario only if no blocking issue is found.
- Run lint, the full unit suite (recording the known baseline parent-access failure separately), build, and Playwright E2E.
- Capture the required desktop/mobile states, inspect overflow and target sizes, and scan artifacts for personal data/secrets.
- Commit in logical slices, push only the feature branch, and report exact SHAs, migrations, selector replacements, screenshots, tests, known limitations, deploy commands, and the deliberately deferred financial boundary.
