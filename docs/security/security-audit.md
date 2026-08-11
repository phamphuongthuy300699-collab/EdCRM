# EdCRM security audit baseline

Дата аудита: 2026-08-11. База: `c63c599fcba763dd0d816812887f39b71da0f7ba`.

## Scope and references

Проверка ориентирована на OWASP ASVS 5.0.0, OWASP API Security Top 10 2023, официальные рекомендации Next.js по response headers/CSP, Supabase по RLS, grants и server-only secret keys, а для эквайринга — на фактически используемые `register.do` и `getOrderStatusExtended.do` из merchant documentation Alfa-Bank. Публикации третьих лиц используются только как сигналы для проверки, не как спецификация протокола.

## Assets

- данные детей и родителей, телефоны и email;
- authentication sessions и связи пользователей с ролями;
- invoices, payments, billing balances и immutable ledger;
- teacher payroll и ставки;
- MAX accounts, bot token и webhook secret;
- media и метаданные использования файлов;
- AlfaBank, Supabase, cron и provider credentials.

## Roles

`anonymous`, `guardian`, `student`, `teacher`, `manager`, `accountant`, `admin`, `owner`, `system/service_role`, AlfaBank callback, MAX webhook и cron worker.

## Trust boundaries

```text
browser -> Next.js -> Supabase -> AlfaBank
                   -> MAX
                   -> filesystem/media
                   -> Docker/reverse proxy
```

Любой переход границы требует отдельной authentication, authorization, input validation и safe-output проверки. Идентификатор организации из body/query не является authority; scope выводится из authenticated membership/guardian/student linkage. `service_role` применяется только после такой проверки либо в явно публичном/provider flow с собственным proof.

## Initial findings

| Severity | Finding | Affected surface | Intended disposition |
|---|---|---|---|
| Critical | Public demo flag grants server authorization | middleware, CRM shared guard, media/staff/parent helpers | Replace with one fail-closed server-only bypass predicate |
| High | Reports filters and UTC boundaries can mix scopes and calendar days | reports API/export/UI | First isolated commit with shared organization date/filter utilities |
| High | Media trusts browser MIME/name and has no byte limit | CRM media API | Size, magic bytes, random server filename, no overwrite |
| High | Privileged RPC execute grants require complete audit | public schema functions | Inventory, revoke public/anon/authenticated for service-only RPC, pgTAP |
| High | Public lead has no bounded abuse protection and logs PII body in demo | public lead API | Structured PII-free log and bounded IP limiter |
| High | Authenticated mutations lack uniform same-origin defense | CRM/teacher/parent/student APIs | Shared Origin/Sec-Fetch-Site guard, provider exemptions |
| Medium | Payment return/callback paths may resolve to an external origin | Alfa create/public-link | Production same-origin/allowlist validation |
| Medium | Expensive payment/MAX/provider calls need sane throttling | payment status/callback, MAX webhook | Bounded per-key limiter with retry allowance |
| Medium | Provider settings APIs may disclose stored secrets | Alfa/MAX settings | Return configured/masked state, never plaintext |
| Medium | Application security headers are absent | Next.js responses | Compatible enforced CSP and standard browser protections |
| Medium | Sensitive APIs need explicit no-store | authenticated API namespaces | Shared response/header policy |
| Medium | Six high npm audit findings reported by clean install | dependency graph | Classify and update only non-breaking paths |
| Low | Docker lacks capability/no-new-privileges and healthcheck | production compose | Add controls after production smoke |

## Existing controls to preserve

- Payment amount is read from `invoices.amount`; browser currently submits `invoiceId`.
- Callback/status flow queries AlfaBank rather than trusting callback status.
- Bank amount is compared with the stored payment amount before settlement.
- Atomic settlement/refund/lesson debit RPCs and unique constraints provide idempotency.
- MAX data access is scoped through verified `guardian_messenger_accounts`.
- Docker runs as non-root and exposes the app only on `127.0.0.1`.

## Audit outputs

См. [API inventory](./api-inventory.md), [production checklist](./production-hardening.md) и [backup/restore runbook](./backup-restore.md). No credential values are recorded in documentation, logs, screenshots or commits.

## Findings and disposition

### Critical

- **Production demo authorization bypass.** Attack: public `NEXT_PUBLIC_DEMO_MODE=true` could make an unauthenticated caller a demo admin. Fixed by one server-only fail-closed `isDemoAuthBypassAllowed()` used in middleware and privileged APIs. Production without `VERCEL_ENV=preview` cannot bypass even when both demo flags are true. Covered by `security-demo-auth.test.ts`.
- **Unrestricted SECURITY DEFINER execution.** Audit found `convert_lead_to_student` and other definer functions inheriting executable grants. Migration `20260811000003_security_grants_hardening.sql` revokes PUBLIC/anon/authenticated, grants service role, and selectively restores only policy helper functions. Covered by 12 pgTAP assertions.

### High

- **Staff cross-tenant/privilege BOLA.** Body `organizationId` could select a different organization and admin-level users could affect owner/admin accounts. All target memberships are now resolved within the actor organization; only owner may assign or mutate owner/admin. Covered by authorization source/unit contracts and SQL cross-org tests.
- **Unsafe media upload.** Oversized/polyglot HTML/SVG, client filenames and overwrite were possible. Upload now has an 8 MiB default, JPEG/PNG/WebP/PDF-by-folder magic checks, random UUID name, exclusive local create/`upsert:false`, path guards, rate limit and audit event.
- **Public lead abuse/PII logging.** Full lead body could be logged and no bounded limit existed. Logs now contain request/result booleans only; submissions are bounded per request fingerprint with cleanup, 429 and `Retry-After`.
- **Dependency vulnerabilities.** Initial audit: 6 high total, 4 production. Next.js 16.2.10 and aligned tooling were upgraded to 16.3.0; safe transitive fixes applied without `--force`. Final full and production audits report zero vulnerabilities.

### Medium

- Cookie mutations lacked a uniform origin check; middleware now rejects foreign Origin/Sec-Fetch-Site for CRM/parent/teacher/student and browser payment mutations. Provider/cron endpoints remain explicitly exempt.
- Payment return paths could resolve to an external origin; production now requires configured application origin. Payment create bodies are strict and amount remains server-derived from invoice.
- Expensive payment status/callback, MAX webhook, media upload, staff password reset and notification worker paths now have bounded application throttles. Reverse proxy remains the first line.
- Provider APIs returned operational errors too directly and MAX returned its stored webhook secret. Public/provider errors are generic; MAX and Alfa return configured flags rather than plaintext credentials.
- Browser headers were absent. Enforced CSP, nosniff, frame denial, referrer/permissions policy and production HSTS are configured; sensitive APIs receive `private, no-store`.
- Critical finance/staff/media/provider settings mutations now write safe `crm_audit_log` records without password/token/secret/provider-body fields.

### Low

- Production container lacked an unauthenticated PII-free healthcheck and capability controls. Added `/api/health`, Docker healthcheck, `init`, `no-new-privileges` and `cap_drop: ALL` while preserving the writable media volume.
- No scheduled dependency/code scan configuration existed. Added weekly Dependabot and least-permission CodeQL.

### Accepted / deferred

- Application rate limiting is process-local and therefore defense in depth, not a distributed quota. Production reverse proxy limits are mandatory; Redis/WAF was intentionally not introduced.
- CSP retains `'unsafe-inline'` for scripts/styles to stay compatible with the current Next/React rendering. `'unsafe-eval'` is development-only. A nonce/hash conversion is a separate hardening task.
- Provider credentials remain in restricted database columns read only by service paths. Migration to Supabase Vault/envelope encryption requires a separate rotation/migration plan.
- `read_only` Docker filesystem is deferred because Next runtime cache and `/opt/edcrm/media` writes need a dedicated smoke/test design.
- The in-process body-size guard checks `File.size` before buffering, but the reverse proxy must reject oversized multipart requests before Next parses them.

## Payment review

- Browser submits `invoiceId`; authoritative amount and `RUB` currency come from the stored invoice/payment. Unknown JSON keys are rejected.
- `/payments/success` performs no database mutation; it calls the server return-status endpoint.
- Alfa callback status is not trusted. The callback locates an existing payment and calls authenticated `getOrderStatusExtended.do`; only the server response can reach atomic settlement/refund RPCs.
- Provider amount in minor units is compared to stored CRM amount before settlement. Mismatch emits `payment_amount_mismatch`, returns a generic error and leaves ledger/balance unchanged.
- Existing unique ledger/payment/refund constraints and atomic RPCs make repeated callback/status/reconciliation idempotent; a final status cannot regress to non-final.
- The reviewed Alfa merchant protocol documents merchant login/password for REST status requests and dynamic callback URL; no compatible callback HMAC/token field was identified for this integration. Therefore no invented signature was added. Callback is a throttled hint followed by an authoritative authenticated bank query.

## Supabase and secret review

- All public business tables were enumerated locally and have RLS enabled. Default anon table access and authenticated TRUNCATE/REFERENCES/TRIGGER grants are revoked, including default privileges.
- All public SECURITY DEFINER functions are fail-closed to service role except explicit authenticated policy helpers that perform their own scope checks.
- `SUPABASE_SECRET_KEY` exists only as a server environment lookup; no `NEXT_PUBLIC_SUPABASE_SECRET_KEY`, committed production env or client-build argument exists. A build test scans static chunks for the configured secret when available.
- Safe repository/history pattern scan found no actual Supabase/Alfa/MAX/cron/private-key credential. Matches were code/test variable names only; rotation not required from this evidence. gitleaks/trufflehog were unavailable, so the limitation is recorded rather than overstating coverage.

## Security events

Structured application logs use `scope: "security"` for `payment_amount_mismatch`, `rate_limit_exceeded`, `csrf_rejected`, `media_upload_rejected` and related webhook failures. View with `docker compose logs edcrm-web` and filter for `[security]`/`scope`. Events deliberately omit request bodies, secrets, full provider responses, phone/email and child data.
