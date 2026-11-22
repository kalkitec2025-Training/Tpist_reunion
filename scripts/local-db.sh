#!/usr/bin/env bash
# Starts a throwaway PostgreSQL (PostgreSQL 16 binaries must be installed) for
# local development and tests, owned by a NON-superuser role like on Render,
# so Row Level Security behaves exactly as in production.
# Usage: scripts/local-db.sh start|stop   → prints DATABASE_URL
set -euo pipefail
BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
DIR=${PG_DIR:-/tmp/b2c-pg}
PORT=${PG_PORT:-54329}
RUN_AS=${PG_RUN_AS:-postgres}
as() { if [ "$(id -u)" = 0 ]; then su "$RUN_AS" -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
case "${1:-start}" in
  start)
    if [ ! -d "$DIR/data" ]; then
      mkdir -p "$DIR" && chown "$RUN_AS" "$DIR" 2>/dev/null || true
      as "$BIN/initdb -D $DIR/data -U postgres --auth=trust >/dev/null"
    fi
    as "$BIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log -w start >/dev/null" || true
    psql -h "$DIR" -p "$PORT" -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='b2c'" | grep -q 1 || \
      psql -h "$DIR" -p "$PORT" -U postgres -qc "CREATE ROLE b2c LOGIN PASSWORD 'b2c' NOSUPERUSER NOBYPASSRLS"
    for db in b2c b2c_test; do
      psql -h "$DIR" -p "$PORT" -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 || \
        psql -h "$DIR" -p "$PORT" -U postgres -qc "CREATE DATABASE $db OWNER b2c"
    done
    echo "DATABASE_URL=postgres://b2c:b2c@localhost:$PORT/b2c"
    echo "TEST_DATABASE_URL=postgres://b2c:b2c@localhost:$PORT/b2c_test"
    ;;
  stop) as "$BIN/pg_ctl -D $DIR/data -m fast stop" ;;
esac
