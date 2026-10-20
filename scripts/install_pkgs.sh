#!/bin/bash
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then exit 0; fi
cd "$CLAUDE_PROJECT_DIR" || exit 1
set -e
[ -f package-lock.json ] && npm ci
npx playwright install chromium
service postgresql start || true
for _ in $(seq 30); do pg_isready -q -h localhost && break; sleep 1; done
pg_isready -h localhost
sudo -u postgres psql -qc "alter role postgres with password 'postgres'"
for db in linkshelf linkshelf_test; do
  sudo -u postgres psql -tAc "select 1 from pg_database where datname = '$db'" | grep -q 1 \
    || sudo -u postgres createdb "$db"
done
exit 0
