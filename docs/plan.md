# Linkshelf build plan

Linkshelf is a read-it-later shelf for one person, deployed publicly on Vercel behind one password.
This program builds it in six stacked PRs, each run by its own Claude Code cloud session.
You can save a URL with a title and tags, mark a link read or unread, filter by one tag, and page through the list 20 links at a time.
Every PR ships with unit tests, two live lanes that drive the real app in a browser, and a perf check.
The PRs, in order, are LS-1 scaffold, LS-2 password gate, LS-3 save, LS-4 read state, LS-5 tag filter, and LS-6 pagination.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `skills/poteto-mode/playbooks/autopilot-stack.md` from the installed plugin, because the six PRs are sequenced and the repo rules withhold merge authority. No agent merges. The operator lands every PR, LS-1 through LS-6, bottom-up. Every PR stops at STACK-READY.

In this plan, "trunk" in a lane or a perf block means the PR's base. For LS-1 that is `main`. For every other PR it is the parent PR's branch tip.

The operator set the live lane count to two per PR. That replaces the playbook's ten lanes. Appendix C records the cost.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on the operator's explicit go.
- [ ] On the operator's go, write this exact text into the standing orders and restate it in your todolist. "Run `docs/plan.md`. Build LS-1, LS-2, LS-3, LS-4, LS-5, and LS-6 in that order as one linear stack, each in its own Claude Code cloud session. Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Each PR gets two live lanes. No agent merges, pushes to `main`, or deploys. The operator lands the stack bottom-up. The program is done when all six PRs are STACK-READY with a clean verdict at their pinned head SHAs."
- [ ] Read these from the installed plugin at program start. Re-read them at every tick.
  - [ ] `skills/poteto-mode/playbooks/autopilot-stack.md`
  - [ ] `skills/poteto-mode/playbooks/autopilot-full.md`
  - [ ] `skills/swarm/SKILL.md`
  - [ ] `.claude/skills/verify/SKILL.md` in the repo once LS-1 creates it. Before that, the `run` skill that ships with Claude Code.
  - [ ] `skills/poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `skills/interrogate/SKILL.md`, `skills/show-me-your-work/SKILL.md`, `skills/technical-writing/SKILL.md`, `skills/unslop/SKILL.md`, and `skills/typescript-best-practices/SKILL.md`
- [ ] Arm the hourly audit tick as a real `/loop` in dynamic mode, which schedules its own wake-up rather than blocking on a sleep. Never leave the cadence to memory.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook from the installed plugin and the standing objective. Audit the operation against both and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then post a short status message to the operator in chat only when the audit found a tracked change that no earlier status message reported, such as a PR opened, a code-ready head, a round launched or closed, a verdict, a merge, a stuck agent and the action taken, a blocker added or cleared, or a decision only the operator can make. Name every such change and nothing else. Do not repeat a table, the merged list, or an unchanged blocker. If the audit found none, end the turn with no reply text. Either way, log this tick's row in your decision trail. The row names the items reported, or none."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR as its own Claude Code cloud session, with the full lifecycle the execution playbook names. A cloud session cannot message the root. The owner reports each head SHA, code-ready, and STACK-READY as a PR comment that starts with the state word, and keeps its decision trail in one PR comment titled `Decision trail` that it edits after every unit. The root reads both on each tick.
- [ ] Follow this dependency graph. Start an owner only after its parent reports code-ready, and branch from the parent's branch.
  - [ ] LS-1 is first. It branches from `main`.
  - [ ] LS-2 after LS-1.
  - [ ] LS-3 after LS-2.
  - [ ] LS-4 after LS-3.
  - [ ] LS-5 after LS-4.
  - [ ] LS-6 after LS-5.
- [ ] Hold the file boundaries. Only LS-1 touches `db/schema.ts`, `drizzle/**`, `.github/workflows/**`, and `scripts/install_pkgs.sh`. LS-2 alone touches `proxy.ts` and `lib/session.ts`. Every later PR touches only the paths its **Files.** block lists.
- [ ] Hold the review gate. LS-2, LS-3, LS-4, LS-5, and LS-6 change an interaction. They wait for the operator's review in chat with screenshots and a video before merge.

### PR mechanics, for every PR

- [ ] Resolve the forge once. Default to `gh`; if `command -v origin` succeeds and Origin can resolve the repository, use `origin pr` for every PR operation. Record any fallback to `gh`. Never require `gt`.
- [ ] Open the PR ready, never draft, per **Opening a PR**. Use the run's built-in PR tool when it has one, else `origin pr create --status open --base <base-branch>` or `gh pr create --base <base-branch>` according to the resolved forge. A stack child targets its parent branch.
- [ ] Run `npm run lint` and `npm run typecheck` once before the PR-facing push. Push with hooks on.
- [ ] Run `/deslop` before each commit and `/no-comments` before review.
- [ ] Triage every review-bot and security-reviewer comment per `../references/bugbot-triage.md`.
- [ ] Before the code-ready report and babysit, and again after merge prep, record the base and head SHAs prepared by the topology owner under the execution playbook.

### Verdict and merge, for every PR

- [ ] A full swarm runs once, at the code-ready head. Another full swarm runs only for new behavior, a redesign, or a large new diff. A rebase, a merge-conflict resolution, or a minor fix gets a single verifier at the new head. Run each full swarm per `skills/swarm/SKILL.md` in its own cloud session at the head SHA, never in the owner's session. One gates lane runs `npm run ci`. The two live lanes come from the PR's **Verify, live** block. The perf lane comes from its **Verify, perf** block. Two or more audit lanes, each with its own focus, read the diff and the receipts and distrust the PR body. The root audits the receipts in the merge-ready report before the verdict.
- [ ] Clean only when every lane is `PASS`. Findings go back to the owner, including a defect that a lane filed as a note. A new head gets a fresh verdict, except for results that stay valid under the patch-id rule in `playbooks/shipping.md`.
- [ ] The root appends each clean PR to the stack with its base set to its parent's branch, and records the verdict's head SHA, base SHA, base branch, and patch-id. Owners never merge, retarget, or rebase onto another branch. The operator lands the stack bottom-up. After a parent lands, the root retargets the child per `playbooks/shipping.md`, and the patch-id rule decides whether the child's verdict still applies.

### Boot recipe, for every live lane

Each live lane runs in its own worktree at the PR head. Drive through the skill path or exact commands recorded in this boot recipe. Lane `<n>` owns port `300<n>` and database `linkshelf_lane<n>`, so no two lanes share a server or rows. A regression lane also runs the base on port `310<n>` with database `linkshelf_lane<n>_base`.

- [ ] `git fetch origin <head-branch> && git checkout <head SHA>`.
- [ ] Confirm the SessionStart hook ran `scripts/install_pkgs.sh`. `psql -h localhost -U postgres -c 'select 1'` prints `1`, and `npx playwright --version` prints a version.
- [ ] Export `DATABASE_URL=postgres://postgres:postgres@localhost:5432/linkshelf_lane<n>`, `LINKSHELF_PASSWORD=lane-password`, and `SESSION_SECRET=lane-secret-0123456789abcdef0123456789`. Run `createdb -h localhost -U postgres linkshelf_lane<n>` and `npm run db:migrate`.
- [ ] Run `npm run build`, then `PORT=300<n> npm run start > /tmp/swarm-<pr-id>/worker-<n>/server.log 2>&1 &`. Wait until `curl -sf http://localhost:300<n>/api/health` prints `ok`.
- [ ] Deliver input only through `.claude/skills/verify/SKILL.md`, which drives headless Chromium with Playwright. Read-only diagnostics are `server.log` and `psql "$DATABASE_URL" -c 'select url, title, tags, read_at, created_at from links order by created_at desc'`.
- [ ] Save every screenshot to `/tmp/swarm-<pr-id>/worker-<n>/<slug>.png` and return the paths with the report.

## Scaffold the app, the links table, CI, and the verify tools (LS-1)

**Depends on.** None.

**Files.**

- [ ] Create `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.gitignore`, and `.env.example` with `create-next-app` (TypeScript, ESLint, App Router, no `src/` directory).
- [ ] Create `app/layout.tsx`, `app/page.tsx`, and `app/api/health/route.ts`.
- [ ] Create `lib/env.ts`, `db/schema.ts`, `db/client.ts`, `db/links.ts`, `drizzle.config.ts`, and the generated `drizzle/0000_*.sql` with its `drizzle/meta/` files.
- [ ] Create `vitest.config.ts`, `test/db.ts`, `test/links.db.test.ts`, `playwright.config.ts`, and `e2e/home.spec.ts`.
- [ ] Create `.github/workflows/ci.yml`.
- [ ] Create `scripts/seed.ts` and `scripts/perf-probe.mjs`.
- [ ] Create `.claude/skills/verify/SKILL.md` with `/create-verification-skill`.
- [ ] Edit `scripts/install_pkgs.sh`.

**Build.**

- [ ] Add the `package.json` scripts `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `e2e` (`playwright test`), `db:generate`, `db:migrate`, and `ci` (`npm run lint && npm run typecheck && npm run test && npm run e2e`).
- [ ] Define the whole `links` table in `db/schema.ts`. Columns are `id uuid primary key default gen_random_uuid()`, `url text not null unique`, `title text not null`, `tags text[] not null default '{}'`, `read_at timestamptz` (null means unread), `created_at timestamptz not null default now()`, and `updated_at timestamptz not null default now()`. Indexes are `links_tags_gin_idx` (GIN on `tags`) and `links_created_at_id_idx` on `(created_at desc, id desc)`. Generate the one migration with `npm run db:generate`. No later PR adds a migration.
- [ ] Parse `process.env` once in `lib/env.ts` with `zod` and export the typed `env`. `DATABASE_URL` is required.
- [ ] Add `listLinks()` to `db/links.ts`. It returns the newest 20 rows, ordered by `created_at desc, id desc`.
- [ ] Render `listLinks()` in `app/page.tsx` as a server component. An empty table shows `No links yet`.
- [ ] Make `GET /api/health` run `select 1` and return `ok` with status 200.
- [ ] Make `test/db.ts` migrate the test database once and truncate `links` before each test.
- [ ] Write `scripts/seed.ts --links <N> --tagged <M> --tag <name>`. It truncates `links`, then inserts N links with distinct URLs and increasing `created_at`. The newest M links carry the tag. A second run with the same arguments leaves the same rows.
- [ ] Write `scripts/perf-probe.mjs --a <baseUrl> [--b <baseUrl>] --path <path> --n <count> [--cookie <value>]`. It alternates requests between A and B, measures time to first byte, discards 5 warm-up requests per side, and prints `{"a":{"p50":..,"p95":..},"b":{..}}` in milliseconds.
- [ ] Make `.github/workflows/ci.yml` run `npm ci`, `npx playwright install --with-deps chromium`, `npm run db:migrate`, and `npm run ci` against a `postgres:16` service container.
- [ ] Make `scripts/install_pkgs.sh` idempotent. In a cloud session it runs `npm ci`, installs Playwright Chromium, starts Postgres, sets the `postgres` role password to `postgres`, and creates the `linkshelf` and `linkshelf_test` databases when they are missing. Keep LF line endings.

**You see.**

- [ ] `npm run ci` exits 0 in a fresh cloud session.
- [ ] `GET /` shows `No links yet`. `GET /api/health` returns 200 with body `ok`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `test/links.db.test.ts` gains three cases. An empty table returns `[]`. With 25 rows, `listLinks()` returns 20 rows, newest first. Two rows with the same `created_at` come back in `id desc` order. Run `npm run test`.
- [ ] `e2e/home.spec.ts` asserts that `/` shows `No links yet`. Run `npm run e2e`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Two lanes on the configured `swarm workers` model at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run the boot recipe at trunk and at head. Trunk is `main`, which has no `package.json`, so record that `npm run build` fails there and gate the head instead. At head, start from a fresh cloud session, let the SessionStart hook finish, run `npm run ci`, then load `/`. Save `home-empty.png`. Pass when the hook exits 0, `npm run ci` exits 0, and the screenshot shows `No links yet`.
- [ ] Lane 2. Run `npx tsx scripts/seed.ts --links 25 --tagged 0 --tag none`, then load `/`. Run the seed command a second time and reload. Save `home-seeded.png`. Pass when the page shows exactly 20 rows, the first row is the newest seeded link, and `select count(*) from links` prints 25 after both seed runs.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Time to first byte of `GET /` on a production build with 10,000 seeded links, p50 and p95. Trunk has no server, so the diff-added work is the whole request, the list query plus the render.
- [ ] Probe. Run `npx tsx scripts/seed.ts --links 10000 --tagged 1000 --tag perf`, start the head per the boot recipe, then run `node scripts/perf-probe.mjs --a http://localhost:3001 --path / --n 100`. Run `EXPLAIN` on the `listLinks()` query.
- [ ] Baseline. Record the trunk fact first. `main` has no server and produces no metric.
- [ ] Rule. Absolute budget. Fail when p50 exceeds 80 ms or p95 exceeds 200 ms, or when `EXPLAIN` shows a sequential scan instead of `links_created_at_id_idx`.

**Review gate.** None. LS-1 is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Base and verdict are current under the execution playbook and the patch-id rule in `playbooks/shipping.md`.
- [ ] The root appends LS-1 to the stack with base `main`. The operator lands it.

## Gate the app behind one password (LS-2)

**Depends on.** LS-1.

**Files.**

- [ ] Create `proxy.ts`. If LS-1 recorded a Next.js major below 16, create `middleware.ts` instead.
- [ ] Create `lib/session.ts`, `app/login/page.tsx`, `app/login/actions.ts`, and `scripts/mint-session.ts`.
- [ ] Create `test/session.test.ts`, `e2e/auth.setup.ts`, and `e2e/auth.spec.ts`.
- [ ] Edit `lib/env.ts`, `app/layout.tsx`, `playwright.config.ts`, `.env.example`, `.github/workflows/ci.yml`, and `.claude/skills/verify/SKILL.md`.

**Build.**

- [ ] Add `LINKSHELF_PASSWORD` (required) and `SESSION_SECRET` (at least 32 characters) to `lib/env.ts`. The server refuses to start when either fails to parse.
- [ ] Write `createSessionToken(now)` and `verifySessionToken(token, now)` in `lib/session.ts`. The token is `v1.<expiresAt>.<signature>`, where the signature is HMAC-SHA256 of `v1.<expiresAt>` under `SESSION_SECRET` through Web Crypto. Tokens expire after 30 days.
- [ ] Write `checkPassword(input)` in `lib/session.ts`. It compares SHA-256 digests of the input and `LINKSHELF_PASSWORD` in constant time.
- [ ] Write `requireSession()` in `lib/session.ts`. Every server action from LS-3 on calls it first and redirects to `/login` when the `ls_session` cookie fails `verifySessionToken`.
- [ ] Make `proxy.ts` redirect every request without a valid `ls_session` cookie to `/login?next=<path>`. Exempt `/login`, `/api/health`, `/_next/`, and `/favicon.ico`.
- [ ] Make the login action set `ls_session` with `httpOnly`, `sameSite=lax`, `path=/`, a 30-day `maxAge`, and `secure` in production. It redirects to `next` only when `next` starts with `/` and not with `//`. Otherwise it redirects to `/`. A wrong password renders `Wrong password`.
- [ ] Add a **Sign out** button to `app/layout.tsx`. Its server action deletes the cookie and redirects to `/login`.
- [ ] Make `scripts/mint-session.ts` print a valid `ls_session` value for the current `SESSION_SECRET`, for perf probes and lanes.
- [ ] Make `e2e/auth.setup.ts` sign in once and save the storage state. Every other spec project depends on it.
- [ ] Add the sign-in step to `.claude/skills/verify/SKILL.md`.

**You see.**

- [ ] `curl -sI http://localhost:3001/` returns `307` with `location: /login?next=%2F`. `curl -s http://localhost:3001/api/health` prints `ok` with no cookie.
- [ ] A wrong password shows `Wrong password`. The right password lands on `/`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `test/session.test.ts` gains six cases. A fresh token verifies. An expired token fails. A token signed under another secret fails. A token with an edited `expiresAt` fails. `checkPassword` accepts the right password and rejects a wrong one. Run `npm run test`.
- [ ] `e2e/auth.spec.ts` gains five cases. A signed-out visit to `/` lands on `/login`. A wrong password shows `Wrong password`. The right password lands on `/`. **Sign out** returns to `/login` and `/` redirects again. A login with `next=//evil.example` lands on `/`. Run `npm run e2e`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Two lanes on the configured `swarm workers` model at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Seed 25 links at both trunk and head, then load `/` in a fresh browser context. Trunk shows the list with no sign-in. At head, sign in with `lane-password` and load `/` again. Save `gate-signed-in.png`. Pass when head redirects to `/login` before sign-in, and after sign-in shows the same 20 rows in the same order as trunk.
- [ ] Lane 2. In a fresh context, open `/?x=1`, submit `wrong`, then submit `lane-password`. Reload, click **Sign out**, and open `/` again. Then run `curl -sI http://localhost:3002/` with no cookie and with a cookie whose last character is changed. Save `login-wrong.png`. Pass when the wrong password shows `Wrong password`, the right one lands on `/?x=1`, the reload stays signed in, sign-out returns to `/login`, and both curl calls return `307`.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Time to first byte of signed-in `GET /` with 10,000 seeded links, p50, at trunk and head. Both sides produce it. Trunk ignores the cookie.
- [ ] Probe. Seed both lane databases with `--links 10000 --tagged 1000 --tag perf`. Run `node scripts/perf-probe.mjs --a http://localhost:3101 --b http://localhost:3001 --path / --n 100 --cookie "ls_session=$(npx tsx scripts/mint-session.ts)"`.
- [ ] Baseline. Record the trunk p50 first.
- [ ] Rule. Fail when head p50 exceeds trunk p50 by more than 5 ms.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 2 screenshots into `/tmp/linkshelf-review/LS-2-review-login-wrong.png`.
- [ ] Record a 30 to 60 second video of the change in a lane worktree with Playwright `recordVideo`. Show the redirect, a wrong password, sign-in, and sign-out. Save it as `/tmp/linkshelf-review/LS-2-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Base and verdict are current under the execution playbook and the patch-id rule in `playbooks/shipping.md`.
- [ ] The root appends LS-2 to the stack with base LS-1's branch. The operator lands it bottom-up.

## Save a link with a title and tags (LS-3)

**Depends on.** LS-2.

**Files.**

- [ ] Create `lib/link.ts`, `app/actions.ts`, `app/save-form.tsx`, and `scripts/perf-db.ts`.
- [ ] Create `test/link.test.ts` and `e2e/save.spec.ts`.
- [ ] Edit `db/links.ts`, `app/page.tsx`, and `test/links.db.test.ts`.

**Build.**

- [ ] Define the branded types `NormalizedUrl`, `Tag`, and `LinkId` and the record `LinkInput = { url: NormalizedUrl; title: string; tags: Tag[] }` in `lib/link.ts`.
- [ ] Write `normalizeUrl(raw)` in `lib/link.ts`. It trims, parses with `new URL`, accepts only `http` and `https`, lowercases the host, drops the default port and the fragment, and keeps the path and query unchanged. It returns `null` for anything else.
- [ ] Write `parseTags(raw)` in `lib/link.ts`. It splits on commas, trims, lowercases, turns inner spaces into `-`, drops empty entries, and removes duplicates in first-seen order. Each tag must match `^[a-z0-9][a-z0-9-]{0,31}$`, and a link has at most 10 tags.
- [ ] Write `parseLinkInput(formData)` in `lib/link.ts`. It returns `{ ok: true, value: LinkInput }` or `{ ok: false, errors }` with one message per field. The title is trimmed and holds 1 to 300 characters.
- [ ] Add `upsertLink(input)` to `db/links.ts`. One statement runs `insert ... on conflict (url) do update set title, tags, updated_at = now() returning id, (xmax = 0) as inserted`. It returns `{ id, outcome: 'created' | 'updated' }`. An update never changes `read_at` or `created_at`.
- [ ] Add the `saveLink` server action to `app/actions.ts`. It calls `requireSession()`, then `parseLinkInput`, then `upsertLink`, then `revalidatePath('/')`.
- [ ] Render the form from `app/save-form.tsx` with `useActionState` above the list. Success shows `Saved <title>` or `Updated <title>` and clears the form. Field errors render under their field.
- [ ] Show each row's title as a link to the URL, the host, the tags, and the saved date in `app/page.tsx`.
- [ ] Write `scripts/perf-db.ts --op upsert --n <count>`. It times `upsertLink` calls against the seeded table and prints p50 and p95 in milliseconds.

**You see.**

- [ ] Saving `https://example.com/a` with title `First` and tags `news, rust` puts `First` at the top with the tags `news` and `rust`.
- [ ] Saving `HTTPS://Example.com/a#top` with title `Renamed` shows `Updated Renamed`, and the table still has one row for `https://example.com/a`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `test/link.test.ts` gains a table for `normalizeUrl`. `HTTPS://Example.com:443/a#x` becomes `https://example.com/a`. `https://a.com/p?q=1` keeps its query. `ftp://a.com` and `not a url` return `null`. It also gains a table for `parseTags`. ` Rust, rust ,web dev` becomes `rust` and `web-dev`. Eleven tags fail. `a_b` fails. Run `npm run test`.
- [ ] `test/links.db.test.ts` gains three cases. Two saves of one normalized URL leave one row, and the second returns `updated` with the new title and tags. An update keeps a `read_at` set before it. An update keeps `created_at`. Run `npm run test`.
- [ ] `e2e/save.spec.ts` gains three cases. A save shows the new row first. A save of the same URL in other casing shows `Updated` and one row. An empty title shows the title error and adds no row. Run `npm run e2e`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Two lanes on the configured `swarm workers` model at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Seed 25 links at trunk and head, sign in, and load `/`. Trunk has no save form, so record that and gate the new behavior at head. At head, save `https://example.com/a` with title `First` and tags `news, rust`. Save `save-new.png`. Pass when the first 20 rows before the save match trunk in order, and after the save `First` is the top row with both tags.
- [ ] Lane 2. At head, save `https://example.com/a` as `First` with tags `news`, then save `HTTPS://Example.com/a#top` as `Renamed` with tags `web`. Then submit `ftp://x`, an empty title, and the tag `a_b`, one per submit. Save `save-update.png`. Pass when the second save shows `Updated Renamed`, `psql` shows one row for `https://example.com/a` with title `Renamed` and tags `{web}`, each invalid submit shows its field error, and the row count is unchanged after the invalid submits.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Two numbers. First, `upsertLink` p50 against 10,000 seeded links, which is diff-added work that trunk lacks. Second, time to first byte of signed-in `GET /`, p50, at trunk and head.
- [ ] Probe. Seed both lane databases with `--links 10000 --tagged 1000 --tag perf`. Run `npx tsx scripts/perf-db.ts --op upsert --n 500` at head. Run `node scripts/perf-probe.mjs --a http://localhost:3101 --b http://localhost:3001 --path / --n 100 --cookie "ls_session=$(npx tsx scripts/mint-session.ts)"`.
- [ ] Baseline. Record the trunk `GET /` p50 first. Record that trunk has no `upsertLink`.
- [ ] Rule. Fail when `upsertLink` p50 exceeds 5 ms, or when head `GET /` p50 exceeds trunk p50 by more than 10 percent.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 and lane 2 screenshots into `/tmp/linkshelf-review/LS-3-review-save-new.png` and `/tmp/linkshelf-review/LS-3-review-save-update.png`.
- [ ] Record a 30 to 60 second video of the change in a lane worktree. Show a new save, an update of the same URL, and one field error. Save it as `/tmp/linkshelf-review/LS-3-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Base and verdict are current under the execution playbook and the patch-id rule in `playbooks/shipping.md`.
- [ ] The root appends LS-3 to the stack with base LS-2's branch. The operator lands it bottom-up.

## Mark a link read or unread (LS-4)

**Depends on.** LS-3.

**Files.**

- [ ] Create `app/link-row.tsx` and `e2e/read.spec.ts`.
- [ ] Edit `db/links.ts`, `app/actions.ts`, `app/page.tsx`, `scripts/perf-db.ts`, and `test/links.db.test.ts`.

**Build.**

- [ ] Add `setRead(id: LinkId, read: boolean)` to `db/links.ts`. It runs `update links set read_at = case when $read then coalesce(read_at, now()) else null end where id = $id` and returns whether a row matched. The operation sets a state rather than flipping it, so a repeat leaves the same row.
- [ ] Add the `setLinkRead` server action to `app/actions.ts`. It calls `requireSession()`, parses the id into `LinkId`, calls `setRead`, and revalidates the current path with its query.
- [ ] Render each row from `app/link-row.tsx`. An unread row shows **Mark read**. A read row shows a `Read` label, muted text, and **Mark unread**. `useOptimistic` flips the label on click.
- [ ] Add `--op set-read` to `scripts/perf-db.ts`.

**You see.**

- [ ] Clicking **Mark read** on a row mutes it and shows `Read`. The state survives a reload. **Mark unread** reverses it.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `test/links.db.test.ts` gains four cases. `setRead(id, true)` twice keeps the first `read_at`. `setRead(id, false)` clears it. An unknown id returns `false`. `setRead` leaves `title`, `tags`, and `created_at` unchanged. Run `npm run test`.
- [ ] `e2e/read.spec.ts` gains two cases. **Mark read** persists across a reload. **Mark unread** restores the unread row. Run `npm run e2e`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Two lanes on the configured `swarm workers` model at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run the LS-3 save scenario at trunk and head, a new save and then an update of the same URL. Trunk has no read state, so record that and gate the new behavior at head. At head, mark the saved link read and reload. Save `read-marked.png`. Pass when the save scenario gives the same rows and messages at trunk and head, and the head row shows `Read` after the reload with a non-null `read_at`.
- [ ] Lane 2. At head, mark a link read, then save the same URL with a new title. Then click **Mark unread** twice fast on another read link. Save `read-after-update.png`. Pass when the updated link still shows `Read` with its original `read_at`, the double-clicked link ends unread with a null `read_at`, and `server.log` holds no error.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Two numbers. First, `setRead` p50 against 10,000 seeded links, which is diff-added work that trunk lacks. Second, time to first byte of signed-in `GET /`, p50, at trunk and head.
- [ ] Probe. Seed both lane databases with `--links 10000 --tagged 1000 --tag perf`. Run `npx tsx scripts/perf-db.ts --op set-read --n 500` at head. Run `node scripts/perf-probe.mjs --a http://localhost:3101 --b http://localhost:3001 --path / --n 100 --cookie "ls_session=$(npx tsx scripts/mint-session.ts)"`.
- [ ] Baseline. Record the trunk `GET /` p50 first. Record that trunk has no `setRead`.
- [ ] Rule. Fail when `setRead` p50 exceeds 5 ms, or when head `GET /` p50 exceeds trunk p50 by more than 10 percent.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 screenshots into `/tmp/linkshelf-review/LS-4-review-read-marked.png`.
- [ ] Record a 30 to 60 second video of the change in a lane worktree. Show mark read, a reload, and mark unread. Save it as `/tmp/linkshelf-review/LS-4-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Base and verdict are current under the execution playbook and the patch-id rule in `playbooks/shipping.md`.
- [ ] The root appends LS-4 to the stack with base LS-3's branch. The operator lands it bottom-up.

## Filter the list by one tag (LS-5)

**Depends on.** LS-4.

**Files.**

- [ ] Create `lib/list-query.ts`, `test/list-query.test.ts`, and `e2e/filter.spec.ts`.
- [ ] Edit `db/links.ts`, `app/page.tsx`, `app/link-row.tsx`, and `test/links.db.test.ts`.

**Build.**

- [ ] Write `parseListQuery(searchParams)` in `lib/list-query.ts`. It returns `{ tag: Tag | null }`. It lowercases `tag` and checks it with the `parseTags` rules from `lib/link.ts`. A missing or invalid tag gives `null`.
- [ ] Change `listLinks` in `db/links.ts` to take `{ tag }`. A tag adds `where tags @> array[$tag]`, so Postgres can use `links_tags_gin_idx`.
- [ ] Make `app/page.tsx` read `searchParams` through `parseListQuery` only. A filtered page shows `Tagged #<tag>` and a **Clear filter** link to `/`. A filter with no matches shows `No links tagged #<tag>`.
- [ ] Make each tag in `app/link-row.tsx` a link to `/?tag=<tag>`.

**You see.**

- [ ] Clicking the `rust` tag opens `/?tag=rust`. Every row on the page has `rust`. **Clear filter** returns to `/`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `test/list-query.test.ts` gains a table. `?tag=Rust` gives `rust`. `?tag=` gives `null`. `?tag=a_b` gives `null`. A repeated `?tag=a&tag=b` gives `a`. Run `npm run test`.
- [ ] `test/links.db.test.ts` gains two cases. `listLinks({ tag: 'rust' })` returns only rows with `rust`, newest first. An unknown tag returns `[]`. Run `npm run test`.
- [ ] `e2e/filter.spec.ts` gains two cases. A tag click filters, and **Clear filter** restores the full list. Opening `/?tag=rust` directly shows the same rows as the click. Run `npm run e2e`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Two lanes on the configured `swarm workers` model at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Seed 25 links with 8 tagged `rust` at trunk and head, sign in, and load `/`. Trunk has no filter, so record that and gate the new behavior at head. At head, click a `rust` tag. Save `filter-rust.png`. Pass when the unfiltered page matches trunk row for row, and the filtered page shows exactly the 8 `rust` links, newest first.
- [ ] Lane 2. At head, open `/?tag=RUST` in a new signed-in context, mark one row read, then open `/?tag=nothing-here`. Save `filter-empty.png`. Pass when `/?tag=RUST` shows the 8 `rust` links, the page stays on `/?tag=rust` after **Mark read** with that row muted, and `/?tag=nothing-here` shows `No links tagged #nothing-here`.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Two numbers. First, time to first byte of signed-in `GET /?tag=perf` with 10,000 links and 1,000 tagged `perf`, which is diff-added work that trunk lacks. Second, signed-in `GET /` p50 at trunk and head.
- [ ] Probe. Seed both lane databases with `--links 10000 --tagged 1000 --tag perf`. Run `node scripts/perf-probe.mjs --a http://localhost:3001 --path '/?tag=perf' --n 100 --cookie ...` at head and `EXPLAIN` the filtered query. Run the interleaved `GET /` probe with `--a http://localhost:3101 --b http://localhost:3001`.
- [ ] Baseline. Record the trunk `GET /` p50 first. Record that trunk ignores `?tag`.
- [ ] Rule. Fail when `GET /?tag=perf` p50 exceeds 80 ms, when `EXPLAIN` does not use `links_tags_gin_idx` or `links_created_at_id_idx`, or when head `GET /` p50 exceeds trunk p50 by more than 10 percent.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 screenshots into `/tmp/linkshelf-review/LS-5-review-filter-rust.png`.
- [ ] Record a 30 to 60 second video of the change in a lane worktree. Show a tag click, the filtered list, and **Clear filter**. Save it as `/tmp/linkshelf-review/LS-5-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Base and verdict are current under the execution playbook and the patch-id rule in `playbooks/shipping.md`.
- [ ] The root appends LS-5 to the stack with base LS-4's branch. The operator lands it bottom-up.

## Page through the list 20 links at a time (LS-6)

**Depends on.** LS-5.

**Files.**

- [ ] Create `app/pager.tsx` and `e2e/paging.spec.ts`.
- [ ] Edit `lib/list-query.ts`, `db/links.ts`, `app/page.tsx`, `test/list-query.test.ts`, and `test/links.db.test.ts`.

**Build.**

- [ ] Add `page` and the constant `PAGE_SIZE = 20` to `lib/list-query.ts`. `parseListQuery` returns `{ tag, page }`. A `page` that is not an integer of 1 or more gives 1.
- [ ] Change `listLinks({ tag, page })` in `db/links.ts` to return `{ links, total }`. It reads `PAGE_SIZE` rows at offset `(page - 1) * PAGE_SIZE` and counts rows under the same filter.
- [ ] Render `app/pager.tsx` under the list. It shows `Page <n> of <last>` with **Previous** and **Next** links that keep `tag`. It hides when `total` is 20 or less. A page past the last shows `Page <n> does not exist` and a link to the last page.
- [ ] Keep tag links and **Clear filter** without `page`, so a new filter starts at page 1.

**You see.**

- [ ] With 45 links, `/` shows `Page 1 of 3`. **Next** opens `/?page=2`. `/?tag=rust&page=2` keeps the tag in both pager links.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `test/list-query.test.ts` gains a table. `?page=0`, `?page=-1`, `?page=abc`, and `?page=2.5` give 1. `?page=3` gives 3. Run `npm run test`.
- [ ] `test/links.db.test.ts` gains three cases. With 45 rows, pages 1, 2, and 3 return 20, 20, and 5 rows. The three pages share no id and together hold all 45. `total` is 45 unfiltered and counts only tagged rows under a tag. Run `npm run test`.
- [ ] `e2e/paging.spec.ts` gains two cases. **Next** and **Previous** walk the pages in order. A filtered page keeps `tag` in the pager links. Run `npm run e2e`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Two lanes on the configured `swarm workers` model at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Seed 45 links with 25 tagged `rust` at trunk and head, sign in, and load `/`. Trunk has no pager, so record that and gate the new behavior at head. At head, click **Next** twice. Save `paging-last.png`. Pass when page 1 at head matches trunk row for row, page 3 shows 5 rows and `Page 3 of 3`, and no id repeats across the three pages.
- [ ] Lane 2. At head, open `/?tag=rust&page=2` in a new signed-in context, click **Previous**, mark a row read, then open `/?page=99`. Save `paging-filtered.png`. Pass when `/?tag=rust&page=2` shows 5 rows and `Page 2 of 2`, **Previous** opens `/?tag=rust&page=1`, the page stays on that URL after **Mark read**, and `/?page=99` shows `Page 99 does not exist` with a link to page 3.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Two numbers. First, time to first byte of signed-in `GET /?page=500` and `GET /?tag=perf&page=50` with 10,000 links and 1,000 tagged `perf`, which is diff-added work that trunk lacks. Second, signed-in `GET /` p50 at trunk and head, since head adds a count query.
- [ ] Probe. Seed both lane databases with `--links 10000 --tagged 1000 --tag perf`. Run `node scripts/perf-probe.mjs --a http://localhost:3001 --path '/?page=500' --n 100 --cookie ...` and the same for `/?tag=perf&page=50` at head. Run the interleaved `GET /` probe with `--a http://localhost:3101 --b http://localhost:3001`.
- [ ] Baseline. Record the trunk `GET /` p50 first. Record that trunk ignores `?page`.
- [ ] Rule. Fail when either paged path has p50 above 100 ms, or when head `GET /` p50 exceeds trunk p50 by more than 10 percent.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 and lane 2 screenshots into `/tmp/linkshelf-review/LS-6-review-paging-last.png` and `/tmp/linkshelf-review/LS-6-review-paging-filtered.png`.
- [ ] Record a 30 to 60 second video of the change in a lane worktree. Show **Next**, **Previous**, a filtered page, and an out-of-range page. Save it as `/tmp/linkshelf-review/LS-6-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Base and verdict are current under the execution playbook and the patch-id rule in `playbooks/shipping.md`.
- [ ] The root appends LS-6 to the stack with base LS-5's branch. The operator lands it bottom-up.

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names, per the **ketchup** skill, with links to the stack root and tip and a one-line verdict per PR.

## Appendix A. Prototype evidence

No prototype ran. The plan was written in a read-only planning session, so no branch or SHA exists for this appendix. The operator settled the three product calls in chat. One password gates the whole app. A save of an existing normalized URL updates its title and tags. The list filters by one tag and pages with `?tag=&page=`, 20 links per page.

These questions stay unproven. The PR named on each one proves it first.

- The cloud session can start Postgres with `service postgresql start` and accept a password login for the `postgres` role. LS-1 lane 1 proves it.
- Playwright Chromium installs and runs headless in the cloud session. LS-1 lane 1 proves it.
- The Next.js major that `create-next-app` installs decides between `proxy.ts` (16 and later) and `middleware.ts`. LS-1 records the version in its PR body, and LS-2 uses the matching file.
- `(xmax = 0)` in `returning` tells an insert from an update under `on conflict do update` on the installed Postgres. The LS-3 DB test proves it.
- The perf budgets of 80 ms, 100 ms, and 5 ms are estimates. LS-1 measures the first real number. A budget change needs a verifier's proof and the root's countersign.

## Appendix B. Alternatives rejected

- A `tags` table with a `link_tags` join table. A `text[]` column with a GIN index answers the only tag query, `tags @> array[$tag]`, with one table and no joins. A join table earns its place only if tags gain their own fields, such as a color.
- Keyset pagination with a cursor. It stays stable when links arrive mid-browse, but the operator chose page numbers in the URL for shareable links. Offset cost at 10,000 rows sits inside the LS-6 budget.
- One migration per feature PR. Drizzle writes `drizzle/meta/_journal.json` on every migration, and stacked branches that each add one conflict on every rebase. The schema is known up front, so LS-1 owns the only migration.
- An `is_read` boolean. `read_at` holds the same state plus when it changed, and one nullable column cannot drift from a second one.
- An auth library such as Auth.js. One shared password needs a signed cookie and one check. A library adds providers, adapters, and tables the app does not use.
- A separate `/new` page for the save form. The form above the list shows the saved row at once, with no navigation.

## Appendix C. Risks

- The public login has no rate limit, so a weak `LINKSHELF_PASSWORD` can fall to guessing. Lands in LS-2. The owner files a tracked issue for a rate limit and puts a strong-password note in `.env.example`.
- `proxy.ts` might miss a path that a future matcher change exposes. Lands in LS-2. Every server action calls `requireSession()` as a second check, and LS-2 lane 2 tries a tampered cookie.
- An open redirect through `next`. Lands in LS-2. The e2e case with `//evil.example` guards it.
- URL normalization merges two URLs that differ only in the fragment, the host casing, or the default port. That merge is the intended behavior. Lands in LS-3. The owner watches for a case where it surprises the user, such as a single-page app that routes on the fragment.
- Perf numbers on shared cloud hardware are noisy. Every PR. The probe interleaves trunk and head, takes 100 samples, and drops warm-up requests. A failing number is rerun once before it counts.
- Two live lanes per PR, set by the operator, cover less than the playbook's ten. Each PR's lanes cover the regression scenario and the riskiest path, and the e2e suite in `npm run ci` covers the rest. The plan check script reports this deviation on every PR.
- A cloud session cannot message the root. Every PR. Owners report through PR comments, and the hourly tick reads them.
- The Vercel deployment needs `DATABASE_URL`, `LINKSHELF_PASSWORD`, and `SESSION_SECRET` set before LS-2 reaches production. The operator sets them. No agent deploys.

## Appendix D. Links and reading list

- Read before editing. The Next.js App Router guides on server actions, `revalidatePath`, and authentication. The Drizzle ORM pages on Postgres array columns, `onConflictDoUpdate`, and `drizzle-kit migrate`. The Playwright guide on authentication with a setup project and saved storage state.
- Run `skills/interrogate/SKILL.md` on LS-2, for the session and redirect code, and on LS-3, for the normalization and upsert contract, before code-ready.
- Run `skills/how/SKILL.md` on `db/links.ts` and `app/page.tsx` at the start of LS-4, LS-5, and LS-6, because each one changes code the PR below it wrote.
- The root keeps its decision trail per `skills/show-me-your-work/SKILL.md` at `~/.claude/orchestrate/linkshelf/trail.tsv`. Each owner keeps its trail in the `Decision trail` PR comment.
