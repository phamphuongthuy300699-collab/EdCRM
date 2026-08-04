# Demo Readiness Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Свести CRM, публичный сайт, конкретные занятия и MAX к уже существующим каноническим сущностям и подготовить проверяемую демонстрацию без изменений платежной и parent-access логики.

**Architecture:** Медиа нормализуются чистыми функциями и отображаются общими публичными компонентами, которые переиспользует CRM preview. Dashboard получает organization-scoped агрегат из серверного API, публичное расписание форматируется одним helper, правила группы синхронизируются с `lesson_sessions` транзакционным RPC, а MAX использует `bot_settings.settings.events` и существующий `notification_outbox`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase/PostgreSQL RPC, Vitest, Playwright.

---

### Task 1: Canonical facilities and contacts media

**Files:**
- Create: `apps/web/src/features/site-editor/media/FacilitiesGallery.tsx`
- Create: `apps/web/src/features/site-editor/media/FacilitiesBlockEditor.tsx`
- Create: `apps/web/src/features/site-editor/media/ContactsMediaPreview.tsx`
- Create: `apps/web/src/shared/utils/site-media-content.ts`
- Modify: `apps/web/src/features/site-editor/media/site-media-slots.ts`
- Modify: `apps/web/src/features/site-editor/media/SiteMediaBlocksEditor.tsx`
- Modify: `apps/web/src/app/(crm)/crm/site/page.tsx`
- Modify: `apps/web/src/app/(public)/LandingPageClient.tsx`
- Modify: `apps/web/src/app/(public)/contacts/page.tsx`
- Test: `apps/web/src/__tests__/demo-readiness-media.test.tsx`

- [ ] Write tests proving canonical `mainImage/equipmentImage/workspaceImage` wins and legacy `home.facilities.images[0]` plus `home.equipment.images[0..1]` remains fallback.
- [ ] Run `npm --workspace apps/web run test -- --run src/__tests__/demo-readiness-media.test.tsx` and verify RED because the resolver and shared gallery do not exist.
- [ ] Implement `resolveFacilitiesMedia(facilitiesContent, equipmentContent)` and `resolveContactsMedia(contactsContent)` so hidden or absent contact slots never read other blocks.
- [ ] Implement `FacilitiesGallery` with a stable responsive 1.5fr/1fr composition and data-driven title, alt and crop for all three positions.
- [ ] Replace separate facilities/equipment editor slots with one `FacilitiesBlockEditor`; save all three canonical fields plus block title/subtitle into `home.facilities` without deleting `home.equipment`.
- [ ] Reuse `FacilitiesGallery` in public JSX and CRM preview; render contacts from `contacts.media` only on `/contacts` and the home contact block.
- [ ] Run the focused media test and existing media tests; verify GREEN.
- [ ] Commit as `fix(site-editor): align public media with CRM slots`.

### Task 2: Hero fields and canonical tariffs

**Files:**
- Modify: `apps/web/src/app/(public)/LandingPageClient.tsx`
- Modify: `apps/web/src/app/(crm)/crm/site/page.tsx`
- Test: `apps/web/src/__tests__/demo-readiness-site-content.test.ts`

- [ ] Write a static contract test that requires public JSX to render `heroTitle`, `heroSubtitle`, `heroBadge`, `heroBullets`, `heroCtaText`, and `heroSecondaryCtaText`, and forbids public use of legacy `trialPrice/monthlyPrice/individualPrice`.
- [ ] Run the focused test and verify RED on the hard-coded hero JSX.
- [ ] Bind every existing hero field to JSX, add the existing `secondaryCtaText` field to CRM load/save, and keep fallbacks only when the block has no value.
- [ ] Remove the unused legacy public price variables and show the CRM hint `Цены редактируются в разделе “Направления и цены”`; keep `course_tariffs` as the rendered tariff source.
- [ ] Run focused tests and verify GREEN.

### Task 3: Concrete dashboard and public schedule

**Files:**
- Create: `apps/web/src/app/api/crm/dashboard/route.ts`
- Create: `apps/web/src/shared/utils/public-schedule.ts`
- Modify: `apps/web/src/app/(crm)/crm/page.tsx`
- Modify: `apps/web/src/app/(public)/page.tsx`
- Modify: `apps/web/src/app/(public)/raspisanie/page.tsx`
- Modify: `apps/web/src/app/(public)/LandingPageClient.tsx`
- Test: `apps/web/src/__tests__/demo-readiness-dashboard.test.ts`
- Test: `apps/web/src/__tests__/demo-readiness-public-schedule.test.ts`

- [ ] Write tests for Moscow date selection, real room/teacher, per-group enrollment counts, empty state, separate rule times, and optional nearest concrete session.
- [ ] Run focused tests and verify RED because dashboard API and schedule helpers are absent.
- [ ] Implement organization-scoped dashboard GET using `requireCrmStaff`, `lesson_sessions.lesson_date`, allowed statuses and active enrollment counts grouped by `group_id`.
- [ ] Make production dashboard load the API once; retain explicit `isDemoMode()` fixtures with a visible `Демо-режим` badge and show `На сегодня конкретные занятия не сформированы` when empty.
- [ ] Implement `formatPublicScheduleRules` and `formatNearestLesson`; query `ends_at` and nearest planned/live `lesson_sessions` for visible groups on both public schedule surfaces.
- [ ] Render each rule on its own line and omit nearest-session text when none exists.
- [ ] Run focused and existing landing tests; verify GREEN.
- [ ] Commit as `fix(dashboard): use concrete lessons and CRM hero content`.

### Task 4: Transactional group-rule synchronization

**Files:**
- Create: `supabase/migrations/20260804000002_sync_group_schedule.sql`
- Modify: `apps/web/src/app/api/crm/schedule/route.ts`
- Modify: `apps/web/src/app/(crm)/crm/settings/page.tsx`
- Modify: `apps/web/src/app/(crm)/crm/groups/page.tsx`
- Test: `apps/web/src/__tests__/demo-readiness-schedule-sync.test.ts`

- [ ] Write migration/API contract tests for organization scope, rule validation, conflict detection, safe deletion predicates, 12-week generation and duplicate safety.
- [ ] Run focused test and verify RED because `replace_group_schedule` RPC does not exist.
- [ ] Add idempotent `public.replace_group_schedule` RPC that locks the group, validates rules, checks teacher/room overlaps, replaces rules, deletes only future planned regular rule-backed non-rescheduled sessions when requested, and inserts 12 weeks of concrete sessions.
- [ ] Add `replace_group_rules` action to the existing schedule API; call the RPC only after owner/admin/manager authorization.
- [ ] Add the `Пересчитать будущие занятия` checkbox and explanatory copy to both existing group editors; update local calendar data and show deleted/created result without a page reload.
- [ ] Run focused tests and verify GREEN.
- [ ] Commit as `fix(scheduling): synchronize group rules and concrete sessions`.

### Task 5: MAX event settings, explicit notification choice and queue controls

**Files:**
- Create: `apps/web/src/lib/bots/max/events.ts`
- Create: `apps/web/src/app/api/crm/bot-settings/max/queue/route.ts`
- Modify: `apps/web/src/app/api/crm/bot-settings/max/route.ts`
- Modify: `apps/web/src/features/scheduling/server.ts`
- Modify: `apps/web/src/lib/payments/publish-invoice.ts`
- Modify: `apps/web/src/app/api/bots/max/webhook/route.ts`
- Modify: `apps/web/src/app/api/crm/schedule/route.ts`
- Modify: `apps/web/src/features/scheduling/ScheduleWorkspace.tsx`
- Modify: `apps/web/src/app/(crm)/crm/settings/page.tsx`
- Test: `apps/web/src/__tests__/demo-readiness-max-settings.test.ts`

- [ ] Write tests proving missing event settings default to true, disabled events do not enqueue, `notifyGuardians=false` suppresses enqueue, schedule self-service can be disabled, and failed retry updates the same row.
- [ ] Run focused test and verify RED because event helpers and queue API do not exist.
- [ ] Implement typed event defaults and previews around existing `buildScheduleNotificationText`; merge `settings.events` in the MAX settings route.
- [ ] Gate schedule enqueue and invoice outbox creation without changing invoice/link/payment behavior; gate the parent schedule command with a temporary-unavailable message.
- [ ] Add `notifyGuardians` to create/reschedule/cancel actions and explicit defaulted checkboxes to schedule modals.
- [ ] Add organization-scoped queue GET/retry POST, last-50 UI, status filters, process-now action and stale-pending cron warning without exposing secrets.
- [ ] Run focused MAX tests and verify GREEN.
- [ ] Commit as `feat(max): add notification event and queue controls`.

### Task 6: Docker cron docs, verification and screenshots

**Files:**
- Create: `docs/deployment/notifications-cron.md`
- Create screenshots under `docs/media/` only when test data and authenticated pages are available.

- [ ] Document both supported worker authentication headers and a system cron command every five minutes with a placeholder secret.
- [ ] Run `npm run lint`.
- [ ] Run full `npm --workspace apps/web run test`, record only the unchanged baseline `parent-access.test.ts`, then run all tests excluding that file.
- [ ] Run `npm --workspace apps/web run build`.
- [ ] Run `npm --workspace apps/web run test:e2e`; mark database-dependent scenarios as environment skips only when credentials are absent.
- [ ] Start the app, execute the supplied manual test-data scenario, and capture the facilities public block, CRM media editor, dashboard, and MAX settings/queue without personal data.
- [ ] Verify `git diff --check`, working-tree scope, migration application commands and Docker update commands.
- [ ] Push `codex/demo-readiness-unification` without merging `main`.
