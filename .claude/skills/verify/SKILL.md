---
name: verify
description: Boot Linkshelf (Next.js + Postgres) on a lane port and database, drive it with headless Chromium through Playwright, and capture screenshots and page facts as proof. Use to confirm any Linkshelf change works in the real app, not just in tests.
---

# Verify Linkshelf

Linkshelf is a Next.js App Router app on Postgres. A user opens `/` in a browser and sees the newest 20 links. Every command below runs from the repo root (the worktree under test). Lane `<n>` owns port `300<n>` and database `linkshelf_lane<n>`. A regression lane also runs the base on port `310<n>` with database `linkshelf_lane<n>_base`. Never use a port or database another lane owns.

## Launch

Set the lane once per shell. `N` is the lane number, `OUT` is where proof lands.

```bash
export N=1
export OUT=/tmp/verify/worker-$N
export PGPASSWORD=postgres
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/linkshelf_lane$N
export LINKSHELF_PASSWORD=lane-password
export SESSION_SECRET=lane-secret-0123456789abcdef0123456789
mkdir -p "$OUT"
```

Prerequisite: `psql -h localhost -U postgres -c 'select 1'` prints `1` and `npx playwright --version` prints a version. If not, run `CLAUDE_CODE_REMOTE=true CLAUDE_PROJECT_DIR=$PWD bash scripts/install_pkgs.sh`.

Create the database, migrate, build, start, and wait for health. Every step is safe to rerun.

```bash
psql -h localhost -U postgres -tAc "select 1 from pg_database where datname = 'linkshelf_lane$N'" | grep -q 1 \
  || createdb -h localhost -U postgres "linkshelf_lane$N"
npm run db:migrate
npm run build
PORT=300$N setsid sh -c 'echo $$ > "$OUT/server.pid"; exec npm run start' > "$OUT/server.log" 2>&1 &
for _ in $(seq 60); do curl -sf "http://localhost:300$N/api/health" | grep -qx ok && break; sleep 1; done
curl -sf "http://localhost:300$N/api/health"; echo
```

Ready means the last `curl` printed `ok`. Health runs `select 1`, so it also proves the database answers. The app reads the database on every request, so reseeding needs no restart.

## Doctor

Read-only. Run this first whenever a result looks wrong.

```bash
curl -s -o /dev/null -w 'health %{http_code}\n' "http://localhost:300$N/api/health"
ps -o pid,pgid,cmd -g "$(cat "$OUT/server.pid")"
psql "$DATABASE_URL" -tAc 'select count(*) from links'
tail -n 5 "$OUT/server.log"
```

Expect `health 200`, a `next-server` process in the `ps` list (the process group this run started), a row count that matches what you seeded, and no stack traces in the log.

## Seed

`scripts/seed.ts --links <N> --tagged <M> --tag <name>` truncates `links`, then inserts N links titled `Link 1` to `Link N` with strictly increasing `created_at`. The newest M carry the tag. Rerunning with the same arguments leaves the same rows.

```bash
npx tsx scripts/seed.ts --links 25 --tagged 0 --tag none
psql "$DATABASE_URL" -c 'select url, title, tags, read_at, created_at from links order by created_at desc limit 5'
```

An empty shelf needs no seed. Truncate with `psql "$DATABASE_URL" -c 'truncate table links'`.

## Drive

One command loads a URL in headless Chromium, saves a full-page screenshot, and prints one JSON line of facts. The two arguments after `node -` are the URL and the screenshot path. Rows carry `data-testid="link-row"`.

```bash
node - "http://localhost:300$N/" "$OUT/home.png" <<'JS'
const { chromium } = require("@playwright/test");

(async () => {
  const [url, shot] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const res = await page.goto(url);
  const rows = page.getByTestId("link-row");
  const count = await rows.count();
  await page.screenshot({ path: shot, fullPage: true });
  console.log(JSON.stringify({
    status: res.status(),
    url: page.url(),
    noLinksYet: (await page.getByText("No links yet").count()) > 0,
    rowCount: count,
    firstRow: count ? (await rows.first().innerText()).trim() : null,
    firstRowHref: count ? await rows.first().locator("a").getAttribute("href") : null,
    shot,
  }));
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
JS
```

To act on the page (click, type, submit) add steps between `page.goto` and the screenshot. Select by role or label first, then by `data-testid`. Never by coordinates. Later PRs extend this recipe with their own controls.

Expected facts:

- Empty table: `noLinksYet: true`, `rowCount: 0`, `firstRow: null`.
- After `--links 25`: `noLinksYet: false`, `rowCount: 20`, `firstRow: "Link 25"`.

## Evidence

- Save every screenshot to `$OUT/<slug>.png` and report the paths. A lane run under swarm uses `/tmp/swarm-<pr-id>/worker-<n>/` as `OUT`.
- Report the JSON line next to each screenshot. Look at the screenshot too. A passing fact with a broken page is a failure.
- Exercise the real path: load the page in the browser. Do not fake it with test-only endpoints.
- Check side effects with `psql "$DATABASE_URL"`. Compare the row count the page shows with `select count(*) from links` after every seed or write.
- The server log is `$OUT/server.log`. Include any stack trace in the report.
- Read-only diagnostics: `psql "$DATABASE_URL" -c 'select url, title, tags, read_at, created_at from links order by created_at desc'`.

## Cleanup

Stop only the server this run started. It was launched with `setsid`, which wrote its own pid to `server.pid`, so `-$pid` is its whole process group.

```bash
kill -- "-$(cat "$OUT/server.pid")" 2>/dev/null
rm -f "$OUT/server.pid"
dropdb -h localhost -U postgres --if-exists "linkshelf_lane$N"
```

Screenshots and `server.log` stay in `$OUT`. Do not delete them. Never kill by process name and never touch another lane's port or database. Skip `dropdb` when a later step needs the rows.

## Perf probe

For time to first byte against a seeded lane:

```bash
npx tsx scripts/seed.ts --links 10000 --tagged 1000 --tag perf
node scripts/perf-probe.mjs --a "http://localhost:300$N" --path / --n 100
```

It prints one JSON line `{"a":{"p50":..,"p95":..}}` in milliseconds. Add `--b <baseUrl>` to alternate against a second server, and `--cookie <value>` for an authenticated path. A non-2xx response aborts the probe.
