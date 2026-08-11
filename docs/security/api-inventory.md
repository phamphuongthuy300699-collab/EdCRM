# API security inventory

Состояние на 2026-08-11. `Org` означает, что scope выводится из authenticated membership/guardian/student relation, а не доверяется body/query. Для cookie mutations в `/api/crm`, `/api/parent`, `/api/teacher`, `/api/student` и browser payment endpoints middleware применяет same-origin guard. Sensitive namespaces получают `private, no-store`.

| Path | Methods | Auth / roles | Org | App rate | Provider | Sensitive |
|---|---|---|:---:|:---:|:---:|:---:|
| `/api/bots/max/webhook` | POST | MAX webhook secret | yes | yes | MAX | yes |
| `/api/crm/bot-settings/max` | GET, POST | staff owner/admin/manager | yes | no | MAX | yes |
| `/api/crm/bot-settings/max/check` | POST | staff owner/admin/manager | yes | no | MAX | yes |
| `/api/crm/bot-settings/max/queue` | GET, POST | staff owner/admin/manager | yes | no | MAX | yes |
| `/api/crm/bot-settings/max/subscribe` | POST | staff owner/admin/manager | yes | no | MAX | yes |
| `/api/crm/dashboard` | GET | CRM staff | yes | no | no | yes |
| `/api/crm/entities/[entity]/[action]` | POST | entity-specific CRM role matrix | yes | no | no | yes |
| `/api/crm/finance` | GET, POST | read owner/admin/accountant/manager; write excludes manager | yes | no | no | yes |
| `/api/crm/finance/export` | GET | finance roles | yes | no | no | yes |
| `/api/crm/finance/reconcile` | POST | owner/admin/accountant | yes | no | no | yes |
| `/api/crm/finance/teacher-rates` | POST | owner/admin/accountant | yes | no | no | yes |
| `/api/crm/guardians` | GET, POST | CRM staff; read also accountant | yes | no | no | yes |
| `/api/crm/guardians/merge` | POST | owner/admin | yes | no | no | yes |
| `/api/crm/invoice-payment-links` | POST | finance roles | yes | no | no | yes |
| `/api/crm/invoices/create` | POST | finance roles | yes | no | no | yes |
| `/api/crm/invoices/settle` | POST | owner/admin/accountant | yes | no | no | yes |
| `/api/crm/leads/convert` | POST | CRM staff | yes | no | no | yes |
| `/api/crm/media` | GET, POST, DELETE | CRM admin/media guard | yes | upload yes | storage | yes |
| `/api/crm/parent-access/disable` | POST | authorized CRM parent-access guard | yes | no | no | yes |
| `/api/crm/parent-access/issue` | POST | authorized CRM parent-access guard | yes | no | no | yes |
| `/api/crm/parent-access/reset-password` | POST | authorized CRM parent-access guard | yes | no | no | yes |
| `/api/crm/parent-access/status` | POST | authorized CRM parent-access guard | yes | no | no | yes |
| `/api/crm/payment-settings/alfabank` | GET, POST | owner/admin | yes | no | Alfa | yes |
| `/api/crm/payment-settings/alfabank/check` | POST | owner/admin | yes | no | Alfa | yes |
| `/api/crm/reports` | GET | report roles | yes | no | no | yes |
| `/api/crm/reports/export` | GET | report roles | yes | no | no | yes |
| `/api/crm/schedule` | GET, POST | CRM staff; teacher mutations ownership-checked | yes | no | MAX outbox | yes |
| `/api/crm/schedule/session/[sessionId]` | GET | CRM/teacher scope | yes | no | no | yes |
| `/api/crm/search` | GET | CRM staff | yes | no | no | yes |
| `/api/crm/staff/create` | POST | admin; only owner assigns owner/admin | yes | no | Supabase Auth | yes |
| `/api/crm/staff/deactivate` | POST | admin; privileged target owner-only | yes | no | Supabase Auth | yes |
| `/api/crm/staff/list` | GET | admin | yes | no | Supabase Auth | yes |
| `/api/crm/staff/reset-password` | POST | admin; privileged target owner-only | yes | yes | Supabase Auth | yes |
| `/api/crm/staff/update` | POST | admin; privileged target owner-only | yes | no | Supabase Auth | yes |
| `/api/crm/students/[studentId]/finance` | GET | finance roles; object-scoped | yes | no | no | yes |
| `/api/crm/students/enrollment` | POST | CRM staff | yes | no | no | yes |
| `/api/crm/students/manage` | POST | CRM staff | yes | no | no | yes |
| `/api/crm/students/search` | GET | CRM staff | yes | no | no | yes |
| `/api/crm/students/status` | POST | CRM staff | yes | no | no | yes |
| `/api/debug/public-data` | GET | owner/admin | membership | no | no | diagnostic |
| `/api/health` | GET | public, no data access | n/a | proxy | no | no |
| `/api/jobs/notifications/process` | GET, POST | cron secret or bot staff | optional/all for cron | yes | MAX | yes |
| `/api/parent/finance` | GET | guardian linkage | yes | no | no | yes |
| `/api/parent/payment-status` | GET | guardian linkage | yes | no | no | yes |
| `/api/parent/schedule` | GET, POST | guardian linkage | yes | no | no | yes |
| `/api/payments/alfabank/callback` | GET, POST | provider hint; authoritative bank query | payment org | per order | Alfa | yes |
| `/api/payments/alfabank/create` | POST | finance member or guardian ownership | yes | yes | Alfa | yes |
| `/api/payments/alfabank/return-status` | GET, POST | exact return tuple or guardian | payment org | yes | Alfa | yes |
| `/api/payments/alfabank/status` | POST | authenticated finance role | yes | yes | Alfa | yes |
| `/api/payments/public-link/create` | POST | public-link capability token | invoice org | yes | Alfa | yes |
| `/api/public/leads` | POST | anonymous validated form | configured org | yes | no | PII input |
| `/api/teacher/payroll` | GET | teacher, own profile | yes | no | no | yes |

## Review notes

- Endpoints marked `no` under App rate still require authorization and same-origin protection where applicable; reverse proxy global limits remain mandatory.
- Provider callbacks are intentionally excluded from CSRF. Alfa callback payload is only a hint: the server locates its payment, queries `getOrderStatusExtended.do`, compares stored amount and settles atomically.
- `service_role` access is never authority by itself. Every browser endpoint using the admin client must first derive organization/object scope from the authenticated actor.
- Parent-access routes are inventoried but their existing business/demo logic was intentionally not changed in this pass.
