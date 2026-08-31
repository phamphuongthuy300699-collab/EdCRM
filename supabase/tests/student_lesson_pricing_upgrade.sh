#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
db_container="${SUPABASE_DB_CONTAINER:-supabase_db_robotics-crm}"

cd "$repo_root"

cleanup() {
  supabase db reset --no-seed >/dev/null
}

trap cleanup EXIT

supabase db reset --version 20260831000002 --no-seed

docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/fixtures/student_lesson_pricing_upgrade_fixture.sqlfixture

supabase migration up

docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/tests/fixtures/student_lesson_pricing_upgrade_verify.sqlfixture
