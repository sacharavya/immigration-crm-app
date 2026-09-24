#!/bin/sh
# Applies the CRM's migrations in order, then the demo data. Idempotent: a
# marker table records what ran, so restarting the stack is a no-op and a
# new migration file is picked up on the next start.
set -eu
export PGPASSWORD="$POSTGRES_PASSWORD"
PSQL="psql -h db -U postgres -d postgres -v ON_ERROR_STOP=1 -q"

until pg_isready -h db -U postgres >/dev/null 2>&1; do sleep 1; done
# storage-api and gotrue create their schemas on boot; our migrations reference both.
until $PSQL -Atc "select 1 from information_schema.tables where table_schema='storage' and table_name='buckets'" | grep -q 1; do echo "waiting for storage schema"; sleep 2; done
until $PSQL -Atc "select 1 from information_schema.tables where table_schema='auth' and table_name='users'" | grep -q 1; do echo "waiting for auth schema"; sleep 2; done

$PSQL -c "create table if not exists public._applied_migrations (name text primary key, applied_at timestamptz default now())"
for f in /migrations/*.sql; do
  n=$(basename "$f")
  if $PSQL -Atc "select 1 from public._applied_migrations where name='$n'" | grep -q 1; then continue; fi
  echo "applying $n"
  $PSQL -f "$f"
  $PSQL -c "insert into public._applied_migrations(name) values ('$n')"
done

if ! $PSQL -Atc "select 1 from public._applied_migrations where name='demo'" | grep -q 1; then
  echo "seeding demo accounts"
  $PSQL -f /init/demo.sql
  $PSQL -c "insert into public._applied_migrations(name) values ('demo')"
fi
$PSQL -c "notify pgrst, 'reload schema'"
echo "database ready"
