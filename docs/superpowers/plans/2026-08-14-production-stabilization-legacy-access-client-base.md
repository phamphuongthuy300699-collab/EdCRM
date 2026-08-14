# Production Stabilization: Legacy Staff Access and Client Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the hardened client lifecycle work onto the current production-shaped base, decouple staff Auth identities from canonical staff profiles, close known baseline failures, and leave a tested stacked branch ready for review without deploying or merging main.

**Architecture:** Keep `profiles.id` and every existing business FK canonical. Add a one-to-one `staff_auth_identities` mapping from Supabase Auth UUID to canonical staff profile UUID, resolve a typed staff context server-side, and teach RLS helpers to resolve the same mapping with a direct-ID compatibility fallback. Reuse `save_group_with_schedule` as the only group persistence contract, import the four reviewed client-base commits, and verify both pre-client enum and post-client text migration stages.

**Tech Stack:** Next.js 16 App Router, TypeScript, Zod, Supabase Auth/PostgreSQL/RLS, pgTAP, Vitest, Playwright.

---

### Task 1: Preserve and integrate the reviewed client-base chain

**Files:**
- Import commits: `34d06e8`, `23b1344`, `449e8b5`, `df662fc`
- Verify: `supabase/migrations/20260812000001_fix_student_create_status_enum.sql`
- Verify/import: `supabase/migrations/20260813000001_client_base_lifecycle_followups.sql`

- [ ] **Step 1: Record the stacked base**

Run:

```bash
git rev-parse HEAD
git rev-parse origin/main
git merge-base --is-ancestor HEAD origin/main
```

Expected: HEAD is `583b3b6b26c7f4c415b36ffba853200d4dad61b5`, origin/main is `e29ad0d11a9db7c017682aa89cafa8f1e58c7ebe`, and the ancestry check reports non-zero because this branch is STACKED.

- [ ] **Step 2: Cherry-pick the reviewed client commits in order**

Run:

```bash
git cherry-pick 34d06e8 23b1344 449e8b5 df662fc
```

Expected: the four logical commits remain visible in order; resolve only conflicts caused by `20260812000001` and the group hotfix, keeping both fixes.

- [ ] **Step 3: Verify both hotfixes survived**

Run:

```bash
rg -n "::public.student_status" supabase/migrations/20260812000001_fix_student_create_status_enum.sql
rg -n "databaseUuidSchema|status: editStatus" apps/web/src/features/scheduling/schemas.ts 'apps/web/src/app/(crm)/crm/groups/page.tsx'
```

Expected: enum cast, database UUID schema, and editable group status are present.

### Task 2: Add the staff Auth identity mapping and RLS context

**Files:**
- Create: `supabase/migrations/20260814000001_staff_auth_identity_mapping.sql`
- Create: `supabase/tests/staff_auth_identity_mapping.test.sql`
- Modify: `apps/web/src/shared/db/types.ts`

- [ ] **Step 1: Write failing pgTAP coverage**

The test must create one modern identity (`auth_user_id = staff_profile_id`), one legacy profile without Auth, and one mapped legacy identity (`auth_user_id <> staff_profile_id`). Assert mapping uniqueness, cross-org rejection, direct fallback, mapped membership/role resolution, teacher-of-group resolution, and service/RLS function grants.

Run:

```bash
supabase test db supabase/tests/staff_auth_identity_mapping.test.sql
```

Expected: FAIL because `staff_auth_identities` and `current_staff_profile_id(uuid)` do not exist.

- [ ] **Step 2: Implement the migration**

Create `public.staff_auth_identities` with:

```sql
organization_id uuid not null references public.organizations(id) on delete cascade,
staff_profile_id uuid not null references public.profiles(id) on delete cascade,
auth_user_id uuid not null unique references auth.users(id) on delete cascade,
created_at timestamptz not null default now(),
created_by uuid null references public.profiles(id),
primary key (organization_id, staff_profile_id)
```

Add a deferred/trigger validation that the canonical profile has an `org_memberships` row in the same organization. Backfill only unambiguous existing Auth-backed memberships. Add `current_staff_profile_id(target_org_id uuid)` resolving mapping first and direct active membership second. Replace `is_org_member`, `has_org_role`, and `is_teacher_of_group` internals to use the canonical profile. Every SECURITY DEFINER function must set `search_path = public`; revoke public/anon and grant only the authenticated RLS helpers plus service role operations.

- [ ] **Step 3: Verify migration and pgTAP**

Run:

```bash
supabase db reset
supabase test db supabase/tests/staff_auth_identity_mapping.test.sql
```

Expected: reset succeeds and every assertion passes.

### Task 3: Introduce an unambiguous server staff context

**Files:**
- Create: `apps/web/src/features/staff/auth-context.ts`
- Create: `apps/web/src/__tests__/staff-auth-context.test.ts`
- Modify: `apps/web/src/app/api/crm/_shared.ts`
- Modify: `apps/web/src/app/api/crm/staff/_shared.ts`

- [ ] **Step 1: Write failing Vitest contracts**

Test a pure resolver with these outputs:

```ts
{
  authUserId: "auth-uuid",
  staffProfileId: "legacy-profile-uuid",
  organizationId: "org-uuid",
  role: "teacher"
}
```

Assert mapped resolution wins, direct modern membership remains valid, inactive membership fails, ambiguous mappings fail, and demo context has explicit `authUserId`/`staffProfileId` names.

Run:

```bash
npm --workspace apps/web run test -- src/__tests__/staff-auth-context.test.ts
```

Expected: FAIL because the resolver/context fields do not exist.

- [ ] **Step 2: Implement context resolution**

Resolve the authenticated user through `staff_auth_identities`, then load the active canonical membership. If no mapping exists, fall back to a direct active membership with `user_id = authUserId`. Return named IDs and never accept a profile ID from the client.

- [ ] **Step 3: Replace ambiguous access fields in staff/business APIs**

Use `authUserId` for rate limiting and Supabase Auth operations. Use `staffProfileId` for teacher filters, business FKs, responsible manager, and audit actor IDs. Keep organization and role checks unchanged or stricter.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm --workspace apps/web run test -- src/__tests__/staff-auth-context.test.ts src/__tests__/security-authorization.test.ts src/__tests__/schedule-operations.test.ts
```

Expected: all focused tests pass.

### Task 4: Provision, reset, deactivate, and reactivate legacy staff safely

**Files:**
- Create: `apps/web/src/app/api/crm/staff/provision-access/route.ts`
- Create: `apps/web/src/__tests__/staff-legacy-access.test.ts`
- Modify: `apps/web/src/app/api/crm/staff/create/route.ts`
- Modify: `apps/web/src/app/api/crm/staff/list/route.ts`
- Modify: `apps/web/src/app/api/crm/staff/reset-password/route.ts`
- Modify: `apps/web/src/app/api/crm/staff/deactivate/route.ts`
- Modify: `apps/web/src/app/api/crm/staff/update/route.ts`
- Modify: `apps/web/src/app/(crm)/crm/settings/page.tsx`

- [ ] **Step 1: Write failing API/source contracts**

Cover: legacy profile remains unchanged; provisioning creates a distinct Auth user and mapping; existing email returns `STAFF_IDENTITY_ALREADY_EXISTS`; no email auto-link; modern staff creation inserts mapping; reset resolves canonical profile to Auth ID; deactivation only disables membership; list reports mapping-derived `hasAuthAccount`; UI labels employee activity separately from portal access.

- [ ] **Step 2: Implement atomic provisioning behavior**

The endpoint accepts `{ staffProfileId, loginEmail }`, requires owner/admin, validates active same-org staff membership, rejects an existing mapping, creates a confirmed Auth user with organization metadata, inserts only the mapping, and returns the temporary password once. If mapping insert fails after Auth creation, delete that newly-created Auth user as compensating cleanup; never create a second profile or membership.

- [ ] **Step 3: Update modern create/reset/list flows**

Modern create inserts the mapping after profile and membership creation. Reset looks up `staff_auth_identities.auth_user_id` and applies ownership/exclusivity checks to that Auth user while auditing canonical `staffProfileId`. List obtains mappings in one query and reports both `staffProfileId` and `hasAuthAccount` without scanning Auth pages by profile UUID.

- [ ] **Step 4: Replace the legacy explanation UI**

Add a login-email confirmation field/dialog. Replace `explainLegacyStaffAccess()` with the provisioning call. Use labels `Сотрудник активен`, `ЛК активен`, `Нет доступа в ЛК`; after success reload staff so the button becomes `Сбросить пароль`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm --workspace apps/web run test -- src/__tests__/staff-legacy-access.test.ts src/__tests__/staff-settings.test.ts src/__tests__/staff-payloads.test.ts
```

Expected: all tests pass.

### Task 5: Map teacher schedule/payroll and add secure read-only admin preview

**Files:**
- Create: `apps/web/src/app/api/teacher/overview/route.ts`
- Create: `apps/web/src/__tests__/teacher-preview.test.ts`
- Modify: `apps/web/src/app/api/crm/schedule/route.ts`
- Modify: `apps/web/src/app/api/crm/schedule/session/[sessionId]/route.ts`
- Modify: `apps/web/src/app/api/teacher/payroll/route.ts`
- Modify: `apps/web/src/app/teacher/page.tsx`
- Modify: `apps/web/src/app/(crm)/crm/settings/page.tsx`
- Modify: `supabase/migrations/20260814000001_staff_auth_identity_mapping.sql`

- [ ] **Step 1: Write failing teacher identity and preview tests**

Assert mapped teacher APIs filter by canonical `staffProfileId`, attendance/lifecycle actor comparisons use the canonical profile, owner/admin can preview an active same-org teacher, teacher-to-teacher preview is forbidden, cross-org targets are hidden, malformed IDs return 400, and preview mutations are disabled.

- [ ] **Step 2: Implement canonical teacher filtering**

Change schedule GET, session detail, lifecycle and attendance RPC actor parameters, and payroll filters from ambiguous Auth ID to canonical staff profile ID. Keep Auth ID only for authentication/rate limits.

- [ ] **Step 3: Implement read-only preview**

The overview API accepts optional `previewTeacherId`. Without it, only role `teacher` can read its own canonical data. With it, require owner/admin and validate an active same-org teacher membership. Return teacher name, sessions, roster summaries, and payroll. In the page, show a prominent `Режим просмотра администратора` banner and disable/hide Start, attendance save, and Complete controls.

- [ ] **Step 4: Run focused tests and Playwright**

Run:

```bash
npm --workspace apps/web run test -- src/__tests__/teacher-preview.test.ts src/__tests__/teacher-operations.test.ts
npm --workspace apps/web exec playwright test e2e/teacher-operations.spec.ts
```

Expected: unit contracts and the focused teacher flow pass.

### Task 6: Unify group edit surfaces around one mapper and save RPC

**Files:**
- Create: `apps/web/src/features/scheduling/group-save-contract.ts`
- Create: `apps/web/src/__tests__/group-save-contract.test.ts`
- Modify: `apps/web/src/app/(crm)/crm/groups/page.tsx`
- Modify: `apps/web/src/app/(crm)/crm/settings/page.tsx`

- [ ] **Step 1: Write a failing round-trip contract test**

For both pages, map one group containing status, capacity, teacher, course, rules, billing, dates, branch, and room. Assert both produce the same `save_group` payload and both preserve null `startsOn`/`endsOn`.

- [ ] **Step 2: Extract the shared mapper**

Define one typed `buildGroupSaveOperation(draft, rules, rebuildFuture)` returning the API payload. Both edit surfaces call it; neither writes groups/rules independently. Retain the group hotfix database UUID schema and active-only enrollment filters.

- [ ] **Step 3: Verify the legacy production group flow**

Run focused unit and Playwright for draft → active and `Вт / Чт 13:00`; verify the RPC remains `save_group_with_schedule` and existing protected-session pgTAP remains green.

### Task 7: Preserve client lifecycle hardening under canonical staff IDs

**Files:**
- Modify imported client API files only where actor/manager IDs are ambiguous
- Test: `apps/web/src/__tests__/client-base-api.test.ts`
- Test: `supabase/tests/client_base_acceptance_flow.test.sql`
- Test: `supabase/tests/client_base_lifecycle_followups.test.sql`

- [ ] **Step 1: Add failing mapped-manager assertions**

Assert interactions, follow-up completion, `responsible_manager_id`, and audit actor IDs use canonical `staffProfileId`, while authorization still starts from the authenticated identity.

- [ ] **Step 2: Apply the canonical context**

Pass only canonical staff profile IDs to client lifecycle RPCs. Preserve tenant subject validation, atomic completion, do-not-contact exclusion, and service-role-only follow-up RPC permission from `df662fc`.

- [ ] **Step 3: Run client acceptance suites**

Run Vitest and both pgTAP files. Expected: guardian-first, student-first, linking, lifecycle, follow-up, and do-not-contact scenarios all pass.

### Task 8: Add production-shape and two-stage student migration evidence

**Files:**
- Create: `supabase/tests/production_shape_legacy_staff_group.test.sql`
- Modify: `supabase/tests/student_create_enum_hotfix.test.sql`
- Document evidence: `docs/deploy.md`

- [ ] **Step 1: Add real-shape fixtures**

Use `a2222222-e222-3333-4444-555555555555`, a profile without Auth, a draft group without schedule rules, a modern identity, and a mapped legacy identity. Assert historical teacher/group/payroll IDs remain canonical.

- [ ] **Step 2: Verify the pre-client enum stage**

Materialize a temporary database migration head through `20260812000001`, call `crm_create_student_with_guardians` with explicit `active`, guardian, and no group, and assert enum status plus no partial records on invalid status.

- [ ] **Step 3: Verify the full post-client chain**

Run a fresh reset through `20260813000001` and `20260814000001`; create a student without guardian/group and assert the text lifecycle status succeeds.

### Task 9: Close baseline unit and Playwright failures without skips

**Files:**
- Modify: `apps/web/src/__tests__/parent-access.test.ts`
- Modify as audit requires: `apps/web/src/app/parent/payments/page.tsx`
- Modify: `apps/web/e2e/payments.spec.ts`
- Modify: `apps/web/e2e/public-lead.spec.ts`

- [ ] **Step 1: Replace the brittle parent static assertion**

Add a pure/access-state behavior test proving production mode with no guardian link yields empty invoices/payments and the access message, while demo fixtures are reachable only when explicit demo mode is true. Remove only the string adjacency assertion.

- [ ] **Step 2: Reproduce and root-cause payments/public-lead failures**

Run each spec alone, capture the real failure, and change either the product contract or deterministic mock fixture. Do not add skips and do not depend on `placeholder.supabase.co` responding.

- [ ] **Step 3: Run full unit and Playwright**

Run:

```bash
npm --workspace apps/web run test
npm --workspace apps/web exec playwright test
```

Expected: zero unexplained failures; existing deliberate unsupported skips are enumerated.

### Task 10: Align deploy/security documentation and final evidence

**Files:**
- Modify: `docs/deploy.md`
- Modify if needed: `docs/security/production-hardening.md`
- Preserve/create screenshots under: `docs/test-results/production-stabilization/`

- [ ] **Step 1: Audit headers without weakening them**

Compare Next configuration and documented nginx headers. If one safe source of truth is evident, remove only the duplicate; otherwise record a concrete follow-up. Preserve HSTS/CSP/X-Frame protection.

- [ ] **Step 2: Keep the real production runbook**

Document self-hosted `/opt/edcrm`, `/opt/supabase`, `edcrm-web`, `127.0.0.1:3000`, the punycode production domain, the nginx buffer incident/fix, and full GET smoke checks for `/`, `/login`, `/crm`, `/api/health`. Do not add deploy commands that are not used and do not use Docker prune.

- [ ] **Step 3: Capture desktop/mobile acceptance evidence**

Capture legacy access, admin preview, teacher mobile (390–430 px), guardian follow-up desktop, student linking mobile, and legacy group edit. Scan screenshots/logs for personal data, email, phone, tokens, and unrelated UUIDs before committing.

- [ ] **Step 4: Run the complete verification matrix**

Run:

```bash
git diff --check
supabase db reset
supabase test db
npm run lint
npm --workspace apps/web run test
npm --workspace apps/web run build
npm --workspace apps/web exec playwright test
```

Expected: reset/build/lint succeed, all pgTAP/unit/Playwright assertions pass, and any intentional skip has a documented unsupported reason.

- [ ] **Step 5: Push without merge or deploy**

Run:

```bash
git push -u origin codex/production-stabilization-legacy-access-client-base
```

Expected: the stacked branch is on GitHub; `main` and production remain untouched.
