# Client Base Lifecycle and Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make guardians and students independent CRM records with continuous lifecycle, shared interaction history, later linking/enrollment, and an operational follow-up queue.

**Architecture:** Keep `guardians` and `students` as canonical people and `leads` as opportunities. Evolve `lead_interactions` additively into tenant-scoped subject interactions, preserve legacy lead rows, and expose multi-entity mutations through authorized server routes backed by transactional RPCs. Reuse existing archive/anonymize, duplicate normalization, enrollment, finance-warning, portal, and merge infrastructure.

**Tech Stack:** PostgreSQL/Supabase migrations and pgTAP, Next.js App Router, TypeScript, React, Zod, Vitest, Playwright.

---

### Task 1: Lock the additive data model with pgTAP

**Files:**
- Create: `supabase/tests/client_base_lifecycle_followups.test.sql`
- Create: `supabase/migrations/20260813000001_client_base_lifecycle_followups.sql`

- [ ] Write failing pgTAP assertions for guardian/student lifecycle values, guardian-only/student-only/combined/lead interactions, follow-up completion and do-not-contact exclusion, tenant isolation, zero-guardian student creation, duplicate link rejection, atomic billing switch, merge reference migration, and preservation of enrollment/financial history.
- [ ] Run `npx supabase test db supabase/tests/client_base_lifecycle_followups.test.sql` and verify failures identify the missing migration.
- [ ] Add backward-compatible columns: guardian source/tags/interest/manager, expanded lifecycle checks; student lifecycle check; nullable interaction subjects and completion timestamp; nullable lead subject FKs; subject and due-date indexes.
- [ ] Replace `crm_create_student_with_guardians` so `[]` is valid and 0/1 primary and billing links are allowed; add transactional `crm_link_student_guardian`, interaction save/complete, and extend guardian merge.
- [ ] Preserve existing `active`, `paused`, and archive mappings; do not backfill prospects or create billing accounts/Auth users.
- [ ] Apply strict RLS and function grants (`search_path`, revoke public/anon/authenticated, grant service role), then rerun pgTAP to green.

### Task 2: Add server contracts for independent records and relationships

**Files:**
- Modify: `apps/web/src/app/api/crm/guardians/route.ts`
- Modify: `apps/web/src/app/api/crm/students/manage/route.ts`
- Create: `apps/web/src/app/api/crm/client-relations/route.ts`
- Create: `apps/web/src/app/api/crm/interactions/route.ts`
- Modify: `apps/web/src/app/api/crm/guardians/merge/route.ts`
- Test: `apps/web/src/__tests__/client-base-api.test.ts`

- [ ] Write failing contract tests for schemas, duplicate confirmation, zero relations, zero enrollment, organization scoping, atomic link/billing switching, and no Auth provisioning.
- [ ] Verify RED with `npm --workspace apps/web run test -- --run src/__tests__/client-base-api.test.ts`.
- [ ] Extend guardian payload/response with lifecycle/source/tags/interest/manager/follow-up summaries and return duplicate candidates before insertion unless `allowDuplicate` is explicit.
- [ ] Allow `guardians: []`, nullable `groupId`, and explicit student lifecycle; never create placeholder relations or enrollments.
- [ ] Implement authorized relation and interaction routes using the transactional RPCs.
- [ ] Rerun the focused tests to green.

### Task 3: Preserve lead continuity

**Files:**
- Modify: `supabase/migrations/20260813000001_client_base_lifecycle_followups.sql`
- Modify: `apps/web/src/app/api/crm/leads/convert/route.ts`
- Test: `apps/web/src/__tests__/client-base-leads.test.ts`

- [ ] Add failing tests for reuse by normalized phone/email, linking resulting guardian/student to the lead, and retaining pre-conversion interactions.
- [ ] Extend the conversion transaction to reuse an active matching guardian and attach existing interactions to resulting subjects without removing legacy lead snapshots.
- [ ] Remove implicit Auth provisioning from ordinary CRM person creation; retain explicit parent-access operations.
- [ ] Run focused tests and pgTAP to green.

### Task 4: Build guardian and student workflows

**Files:**
- Modify: `apps/web/src/app/(crm)/crm/guardians/page.tsx`
- Modify: `apps/web/src/app/(crm)/crm/students/page.tsx`
- Modify: `apps/web/src/app/(crm)/crm/students/[studentId]/page.tsx`
- Modify: `apps/web/src/features/students/domain.ts`
- Modify: `apps/web/src/shared/utils/entity-lifecycle.ts`
- Test: `apps/web/src/__tests__/client-base-ui-contract.test.ts`
- Test: `apps/web/src/__tests__/student-domain.test.ts`

- [ ] Write failing UI/domain tests for lifecycle independent of enrollment, all requested filters, independent create options, later linking, portal-disabled state without children, and mobile `CrmDialog` use.
- [ ] Add guardian create/edit dialog, duplicate resolution, contact/lifecycle fields, children and interaction sections.
- [ ] Update student creation so parent and group can both be omitted; add existing/new guardian linking and lifecycle actions without deleting enrollment history.
- [ ] Keep demo defaults (`tags=[]`, empty interactions, null next contact) and StudentPicker compatibility.
- [ ] Run focused tests to green.

### Task 5: Add the follow-up queue

**Files:**
- Create: `apps/web/src/app/(crm)/crm/followups/page.tsx`
- Create: `apps/web/src/app/api/crm/followups/route.ts`
- Modify: `apps/web/src/app/(crm)/crm/CrmLayoutClient.tsx`
- Test: `apps/web/src/__tests__/followups.test.ts`

- [ ] Write failing tests for overdue/today/7-days/later/no-date grouping, do-not-contact exclusion, explicit completion, and quick interaction actions.
- [ ] Implement a tenant-scoped queue over incomplete interaction follow-ups and latest contact summaries.
- [ ] Add navigation and responsive list/cards with quick actions that create an interaction and optionally schedule the next action.
- [ ] Run focused tests to green.

### Task 6: Search, lifecycle safety, and operations documentation

**Files:**
- Modify: `apps/web/src/app/api/crm/search/route.ts`
- Modify: `apps/web/src/app/api/crm/entities/[entity]/[action]/route.ts`
- Modify: `apps/web/src/shared/utils/entity-lifecycle.ts`
- Modify or Create: `docs/operations/production-runbook.md`
- Test: `apps/web/src/__tests__/client-base-lifecycle.test.ts`

- [ ] Add failing tests for guardian child search, student guardian email search, archive/restore history preservation, and destructive-action blocking when interactions/history exist.
- [ ] Extend search and dependency counts without weakening controlled anonymization/delete behavior.
- [ ] Document nginx proxy buffers and full-body smoke GETs for `/`, `/login`, and a CRM redirect/auth route; do not change global security headers.
- [ ] Run focused tests to green.

### Task 7: Production-like E2E and final verification

**Files:**
- Create: `apps/web/e2e/client-base-lifecycle-followups.spec.ts`
- Create: `docs/media/client-base-lifecycle-followups/guardian-followup-desktop.png`
- Create: `docs/media/client-base-lifecycle-followups/student-link-mobile.png`

- [ ] Add a sanitized parent-first Playwright flow: guardian without child → interaction/follow-up → child without group → later relation/enrollment.
- [ ] Cover student-first, inactive/reactivation, do-not-contact, and archive/restore at DB/API level.
- [ ] Run `git diff --check`, `npx supabase db reset`, all pgTAP, `npm run lint`, full Vitest, build, and full Playwright.
- [ ] Reproduce any unrelated failures on base `a338819` and report them without changing parent access, payments, MAX, invoicing, or unrelated demo flows.
- [ ] Create logical commits and push `codex/client-base-lifecycle-followups`; do not merge `main`.

## Audit decisions

- `guardians` is already the canonical adult record and can exist without children; no `clients/persons` table is needed.
- `students` has no guardian/group FK, but the creation RPC/API currently enforces both relationship invariants; relax those checks rather than create placeholders.
- `student_guardians` already has unique `(student_id, guardian_id)` and a partial unique billing-contact index; add a matching primary invariant and an atomic link/switch RPC.
- `lead_interactions` is the only interaction store; evolve it in place by making `lead_id` nullable and adding guardian/student subjects plus a subject-required check.
- `leads.converted_guardian_id` and `converted_student_id` already preserve person links; conversion must reuse normalized guardian contacts and keep lead snapshot fields.
- Existing archive/anonymize and dependency-aware destructive workflows remain canonical; inactive is a lifecycle state, not archive/delete.
- Finance already records `missing_billing_contact`; independent students must not create accounts or fake guardians.
- Guardian/student creation must never create Auth identities; parent access remains explicit and unavailable until a child relationship exists.
