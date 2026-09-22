#!/bin/sh
# Root-owned host cron entrypoint. Never completes lessons or touches finance.
set -eu
exec /usr/bin/flock -n /run/lock/edcrm-start-due-lessons.lock \
  /usr/bin/docker exec supabase-db psql -U supabase_admin -d postgres \
    -v ON_ERROR_STOP=1 -Atc 'select public.crm_start_due_lessons();'
