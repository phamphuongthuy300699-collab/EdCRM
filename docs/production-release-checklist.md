# Production release checklist: develop -> main

Use this checklist for the production release that merges `develop` into `main` and deploys from `main`.

Do not run destructive database commands. Do not reset the production database. Do not commit `.env.production`, Supabase service keys, or live Alfa-Bank credentials.

## 1. Pre-merge checks on workstation

```bash
git fetch origin main develop
git checkout develop
git status --short --branch
git diff --name-status origin/main...develop -- supabase/migrations
git diff origin/main...develop -- supabase/migrations/20260621000001_lms_sales_light.sql
```

Expected:

- worktree is clean;
- old migration `20260621000001_lms_sales_light.sql` has no release-critical changes that production would miss;
- any required production data/schema change is represented by a new migration after `main`;
- baseline fixup migration `20260701000000_baseline_roboks_seed_fixup.sql` is present before later 20260701 migrations.

Run local verification:

```bash
npm ci
npm run lint
npm --workspace apps/web run test
npm --workspace apps/web run build
```

Optional local migration rehearsal when Docker is available:

```bash
git worktree add ../edcrm-main-migration-check origin/main
cd ../edcrm-main-migration-check
supabase start
cd ../EdCRM
supabase migration up
```

If `origin/main` itself cannot be replayed from an empty local database, test against a copy/backup of the existing main database instead. The production path is "existing DB + pending migrations", not reset.

## 2. Merge develop into main

```bash
git checkout main
git pull origin main
git merge --no-ff develop
git push origin main
```

Do not merge if checks from step 1 failed.

## 3. Production backup

Run on the production server before pulling code or applying migrations:

```bash
cd /opt/EdCRM
mkdir -p /opt/edcrm/backups
BACKUP_TS="$(date +%Y%m%d-%H%M%S)"
docker compose -f docker-compose.prod.yml exec -T db pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="/tmp/edcrm-${BACKUP_TS}.dump" \
  "$POSTGRES_DB"
docker compose -f docker-compose.prod.yml cp "db:/tmp/edcrm-${BACKUP_TS}.dump" "/opt/edcrm/backups/edcrm-${BACKUP_TS}.dump"
```

If production uses Supabase Cloud instead of a local `db` service, create the backup from the Supabase dashboard or with the Supabase CLI against the production project. Keep the backup outside Git.

## 4. Pull main on production

```bash
cd /opt/EdCRM
git fetch origin main
git checkout main
git pull --ff-only origin main
git status --short --branch
```

## 5. Apply migrations without reset

Never run `supabase db reset` on production.

For Supabase-managed production:

```bash
cd /opt/EdCRM
supabase migration list
supabase db push --include-all
supabase migration list
```

For a self-hosted Postgres service, apply only pending SQL files after the last applied migration:

```bash
cd /opt/EdCRM
ls supabase/migrations
# apply pending files in timestamp order with psql or your migration runner
```

Confirm these migrations are applied:

- `20260701000000_baseline_roboks_seed_fixup.sql`
- all later pending migrations from `develop`

## 6. Copy media and switch local media driver

Create the host media directory and make it writable by the container user:

```bash
sudo mkdir -p /opt/edcrm/media
sudo chown -R 1001:1001 /opt/edcrm/media
```

Copy existing media files into the same relative folder structure used by CRM paths:

```bash
rsync -av ./apps/web/public/media/ /opt/edcrm/media/
```

If media currently lives in Supabase Storage, export/download it first, then copy so paths look like:

```text
/opt/edcrm/media/branding/roboks-logo.svg
/opt/edcrm/media/teachers/photo.jpg
/opt/edcrm/media/student-projects/project.jpg
```

## 7. Update environment

Edit only the server-local env file. Do not commit it.

```bash
sudo nano /opt/EdCRM/.env.production
```

Required media values for local production:

```bash
MEDIA_DRIVER=local
NEXT_PUBLIC_MEDIA_DRIVER=local
MEDIA_LOCAL_DIR=/opt/edcrm/media
NEXT_PUBLIC_MEDIA_BUCKET=site-assets
```

Do not change live Alfa-Bank credentials during this release unless there is a separate approved payment cutover. Keep secrets in `.env.production` or CRM payment settings only.

## 8. Build and restart Docker

```bash
cd /opt/EdCRM
docker compose -f docker-compose.prod.yml build edcrm-web
docker compose -f docker-compose.prod.yml up -d edcrm-web
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200 edcrm-web
```

The production compose file mounts `/opt/edcrm/media` into the container at `/opt/edcrm/media`.

## 9. Smoke tests

Run from a safe workstation or the server:

```bash
curl -I https://robotics-lipetsk.ru/
curl -I https://robotics-lipetsk.ru/contacts
curl -I https://robotics-lipetsk.ru/media/branding/roboks-logo.svg
curl -I https://robotics-lipetsk.ru/crm
```

Manual smoke:

- public home page loads on mobile and desktop;
- lead form submits with name, phone, optional child name;
- contacts page map shows correct branch markers;
- legal pages open from footer and render saved text;
- CRM media upload stores a relative path and serves it from `/media/...`;
- CRM staff edit can change sort order and upload teacher photo;
- payment settings page opens, but live Alfa-Bank credentials are not changed.

## 10. Rollback notes

If app deploy fails before migrations are applied:

```bash
git checkout <previous-main-commit>
docker compose -f docker-compose.prod.yml build edcrm-web
docker compose -f docker-compose.prod.yml up -d edcrm-web
```

If migrations were applied and a rollback is needed, restore from the backup made in step 3. Do not improvise manual destructive SQL on production.
