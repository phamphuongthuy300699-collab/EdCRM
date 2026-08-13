# Deploy EdCRM

## Environments

### `develop` -> Vercel

Use Vercel preview deployments for the public site and CRM checks before production.

1. Connect the GitHub repository to Vercel.
2. Set the Vercel project root to `apps/web`.
3. Keep build command as:

```bash
npm --workspace apps/web run build
```

4. Configure environment variables in the Vercel dashboard. Do not commit `.env` files.
5. Push or merge into `develop`; Vercel creates a preview deployment.

Required runtime variables are documented in `.env.example`.

### `production` -> server

Production is deployed from a server with Docker and Docker Compose. The image uses Next.js standalone output from the monorepo root.

Server files:

- repository checkout;
- `.env.production` on the server only;
- Docker and Docker Compose installed.

Example first-time setup:

```bash
git clone <repo-url> EdCRM
cd EdCRM
cp .env.example .env.production
```

Fill `.env.production` on the server. Never commit it.

## Production Deploy Command

Production is updated only from the `production` branch. Vercel is used for testing `develop`; the server deploy script pulls and restarts the Docker service from `production`.

Run on the production server:

```bash
sudo /opt/scripts/deploy-edcrm-production.sh
```

Check status:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f edcrm-web
```

The container is published only on `127.0.0.1:3000`; expose it through the server reverse proxy.

## Secrets

Do not store secrets in Git. Keep these only in Vercel environment variables or server `.env.production`:

- Supabase URL and publishable key;
- Supabase service key;
- Alfabank credentials;
- any future payment, email, or storage credentials.
# Production 502 and full-GET smoke

If nginx reports `upstream sent too big header while reading response header from upstream` while Next.js is healthy, keep the production proxy buffers at least:

```nginx
proxy_buffer_size 16k;
proxy_buffers 8 16k;
proxy_busy_buffers_size 32k;
```

After every deployment, check response bodies rather than only `HEAD` or `/api/health`:

```bash
curl --fail --show-error --silent https://robototehnika-lipetsk.ru/ >/dev/null
curl --fail --show-error --silent https://robototehnika-lipetsk.ru/login >/dev/null
curl --fail --show-error --silent --location https://robototehnika-lipetsk.ru/crm >/dev/null
```

Any `502` on a full GET blocks the release. Do not use `docker system prune`, `docker volume prune`, or remove database volumes during this check.
