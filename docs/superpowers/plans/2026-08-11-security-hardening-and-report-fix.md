# EdCRM Security Hardening and Report Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the identified EdCRM security gaps and align scoped reports without rewriting the existing payment, MAX, parent, attendance, ledger or payroll architecture.

**Architecture:** Add small shared server-only security primitives for demo authorization, origin checks, response policy, throttling and audit logging. Keep financial invariants in existing RPCs and provider verification services; harden their inputs and boundaries. Validate database exposure with a narrow migration and pgTAP rather than moving authorization into a new layer.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Supabase/PostgreSQL RLS, pgTAP, Vitest, Playwright, Docker Compose, GitHub Actions.

---

### Task 1: Align reports and organization calendar

**Files:** reports route/export/page, `src/lib/reports/management.ts`, new `src/lib/reports/date-range.ts`, report tests.

- [ ] Add failing tests for Moscow calendar dates, previous-month boundaries, branch/teacher isolation, scoped lesson debits and CSV/API filter parity.
- [ ] Run focused tests and confirm failures are caused by UTC conversion and missing export filters.
- [ ] Add one date-range utility returning local dates and UTC timestamp bounds with `Europe/Moscow` fallback.
- [ ] Scope students through filtered active enrollments; scope sessions, attendance, lesson debits and payroll through filtered group/session IDs.
- [ ] Keep cash/debt organization-wide and return explicit scope metadata used by the UI and debt CSV.
- [ ] Make attendance/payroll exports consume the same branch/course/group/teacher/date filter builder as the screen.
- [ ] Run focused tests, lint and build; commit `fix(reports): align filters exports and organization timezone`.

### Task 2: Remove production demo authorization bypass

**Files:** shared demo auth helper, middleware, CRM/media/staff/parent guards, security demo tests.

- [ ] Add failing environment-matrix tests proving production Docker cannot bypass with `NEXT_PUBLIC_DEMO_MODE=true` and preview/dev can bypass only with `DEMO_AUTH_BYPASS=true`.
- [ ] Implement `isDemoAuthBypassAllowed()` using the fail-closed server-only predicate.
- [ ] Replace every server authorization use of `isDemoMode()`; retain safe client fixture/UI uses.
- [ ] Run the demo security tests and source audit; commit `fix(auth): prevent production demo authorization bypass`.

### Task 3: Add shared API security controls

**Files:** new `src/lib/security/{origin,rate-limit,response,audit}.ts`, authenticated mutation routes, public lead, tests.

- [ ] Add failing tests for foreign Origin rejection, same-origin acceptance, bounded lead bursts, no-store and PII-free logging.
- [ ] Implement same-origin validation from trusted configured app origin and `Sec-Fetch-Site`, excluding provider/cron routes.
- [ ] Implement a bounded in-process limiter with cleanup, stable IP/key extraction, Retry-After and safe fail-closed behavior within one process.
- [ ] Apply the guard to cookie-authenticated mutations and limits to leads, payment create/status, media, staff resets and manual worker calls.
- [ ] Emit structured security events without body/PII/secrets and reuse `crm_audit_log` for authenticated critical actions.
- [ ] Run focused authorization/CSRF/abuse tests; commit `feat(security): harden API authorization csrf and abuse controls`.

### Task 4: Harden payments, MAX and provider settings

**Files:** Alfa create/public-link/callback/status utilities and routes, MAX webhook/settings routes, payment security tests.

- [ ] Add failing tests for strict create body, external production return URLs, forged callback status, duplicate operations, amount mismatch, refunded-to-paid and emergency switches.
- [ ] Make create schemas strict, keep invoice amount authoritative and validate production return/fail/callback origins.
- [ ] Throttle repeated status/callback work per provider order while preserving provider retry tolerance; never trust callback status.
- [ ] Return generic public errors with request IDs and structured security events for mismatches/suspicious callbacks.
- [ ] Mask provider secrets in browser responses and add fail-closed payment/MAX emergency switches.
- [ ] Verify against the documented Alfa register/status contract; do not invent a signature mechanism.
- [ ] Run payment and MAX contract tests; commit with the payment/browser hardening group.

### Task 5: Harden uploads and browser policy

**Files:** media validation utility/API, `next.config.ts`, Docker files, media/header tests.

- [ ] Add failing tests for oversized files, HTML-as-JPEG, scripted SVG, traversal, duplicate names, valid JPEG/PNG/WebP/PDF and security headers.
- [ ] Enforce size before buffer allocation where available, then verify magic bytes and folder-specific allowlists.
- [ ] Generate cryptographically random filenames and upload with `upsert: false`; retain guarded local paths and audit upload/delete.
- [ ] Add compatible CSP, nosniff, DENY/frame-ancestors, referrer, permissions and production HSTS.
- [ ] Add `no-new-privileges`, `cap_drop: ALL`, `init` and an unauthenticated non-PII healthcheck, preserving the media volume.
- [ ] Run media tests, build and production-like smoke; commit `feat(security): secure payment callbacks uploads and browser headers`.

### Task 6: Audit and harden database authorization

**Files:** new security migration, `supabase/tests/security_rls.test.sql`, authorization tests.

- [ ] Inventory all public tables, RLS flags, grants, policies and SECURITY DEFINER functions after a clean reset.
- [ ] Add failing pgTAP for anon private-table denial, org A/B separation and denial of service-only RPC execution.
- [ ] Add a minimal migration enabling missing RLS, reducing excessive grants and revoking privileged function execution from PUBLIC/anon/authenticated.
- [ ] Preserve intentionally user-callable RPCs only when they perform their own membership/object checks.
- [ ] Add representative cross-tenant API tests for admin, teacher, guardian and student object substitution.
- [ ] Reset Supabase and run finance plus security pgTAP suites.

### Task 7: Supply-chain, secrets, inventory and runbooks

**Files:** security docs, `.github/dependabot.yml`, CodeQL workflow, package lock only if safe non-breaking updates exist.

- [ ] Run `npm audit`, production-only audit and secret/history scanners without printing discovered values.
- [ ] Classify each dependency finding and update critical/high packages only where tests/build demonstrate compatibility; never use force.
- [ ] Add weekly Dependabot and least-privilege CodeQL workflows.
- [ ] Generate the API inventory with methods, auth, roles, scope, rate-limit/provider/sensitivity fields.
- [ ] Complete `security-audit.md`, `production-hardening.md` and `backup-restore.md`, including accepted/deferred risks and kill switches.
- [ ] Commit `chore(security): add audits supply-chain checks and production runbooks`.

### Task 8: Adversarial verification and delivery

**Files:** focused Vitest/pgTAP/Playwright security suites and red-team evidence in audit docs.

- [ ] Run local adversarial cases for payment amount/status/callback/replay, cross-org IDs, demo production env, malicious upload, cross-origin mutations and endpoint bursts.
- [ ] Run clean `supabase db reset`, finance pgTAP, security pgTAP, lint, full unit tests, build, full E2E, both npm audits and `git diff --check`.
- [ ] Record only existing baseline failures separately; do not disable or workaround them.
- [ ] Verify production-like Docker startup and health endpoint.
- [ ] Commit `test(security): add adversarial authorization and payment coverage`, push only `codex/security-hardening-and-report-fix`, and do not merge main.
