#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
db_container="${SUPABASE_DB_CONTAINER:-supabase_db_robotics-crm}"

cd "$repo_root"

supabase db reset --version 20260814000002 --no-seed

docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/fixtures/payment_cleanup_upgrade_fixture.sqlfixture

supabase migration up

docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/fixtures/payment_cleanup_upgrade_verify.sqlfixture
