# Production hardening checklist

Этот runbook применяется перед переносом EdCRM в production. Он не содержит секретов и не заменяет проверку конкретного сервера.

## Network and TLS

- Публиковать только TCP 80/443; 80 перенаправляет на HTTPS. Приложение остаётся на `127.0.0.1:3000` за reverse proxy.
- Supabase/PostgreSQL/Studio/API management ports не публиковать в Internet. Ограничить private network или localhost.
- TLS-сертификат и цепочка должны проходить автоматическое обновление. HSTS включён приложением; до запуска проверить, что все поддомены действительно HTTPS-ready.
- Reverse proxy должен перезаписывать, а не принимать от Internet произвольные `X-Real-IP`/`X-Forwarded-For`. Приложение доверяет этим заголовкам только после такой нормализации.
- Ограничить body: 10 MiB для `/api/crm/media`, 256 KiB для provider webhooks и 1 MiB для обычных JSON API. Добавить отдельные sane rate limits для leads, payment status/callback и MAX.

## Host and containers

- SSH только по ключам; password authentication отключать лишь после проверки второго рабочего ключа и аварийного доступа.
- Firewall: ingress 22 с административного allowlist, 80/443 публично, остальное deny. Включить документированную политику unattended security updates и окно перезагрузки.
- Запускать `docker compose -f docker-compose.prod.yml`; контейнер non-root, `no-new-privileges`, `cap_drop: ALL`, `init: true`.
- Не включать `read_only` без отдельной проверки Next.js cache и writable media volume `/opt/edcrm/media`.
- Настроить лимиты размера и ротацию Docker logs; security events ищутся по `scope=security` или `[security]`.

## Secrets and application

- `.env.production` хранится только на сервере с mode `0600`, не входит в Git и backup, доступный разработчикам.
- `SUPABASE_SECRET_KEY`, Alfa password, MAX token/webhook secret и cron secrets никогда не имеют `NEXT_PUBLIC_` prefix. После подозрения на утечку — rotation у провайдера, затем controlled redeploy.
- `DEMO_AUTH_BYPASS` отсутствует в Docker production. `NEXT_PUBLIC_DEMO_MODE` может включать только демонстрационный UI и не выдаёт права.
- Проверить canonical `APP_URL`/`NEXT_PUBLIC_APP_URL`; payment return/callback URLs не должны указывать на внешний origin.
- Alfa gateway должен использовать один из встроенных HTTPS-hosts Альфа/paymentgate и путь `/payment/rest/`. Если банк документированно выдаёт другой host, добавить только hostname в server-only `ALFABANK_ALLOWED_GATEWAY_HOSTS` (через запятую), затем повторить provider check; IP, HTTP, credentials-in-URL и redirect не разрешаются.
- Emergency response: `PAYMENTS_EMERGENCY_DISABLED=true` и/или `MAX_EMERGENCY_DISABLED=true`, затем restart. Switches fail closed и не меняют ledger.

## Deploy gate

1. Выполнить [backup procedure](./backup-restore.md) и записать текущий migration HEAD.
2. `npm ci`, lint, unit, build, E2E, `npm audit --omit=dev`, Supabase reset/pgTAP на CI/staging.
3. Собрать образ без production secret в build args; запустить healthcheck `/api/health`.
4. Smoke: public site, login, CRM, teacher, parent, Supabase auth/media, тестовый Alfa redirect и MAX settings check.
5. Проверить CSP/browser console, `Cache-Control: private, no-store` для sensitive APIs и отсутствие `unsafe-eval` в production CSP.
6. После deploy проверить migration status, health, provider toggles, error/security logs и пробную операцию без реальных данных детей.
