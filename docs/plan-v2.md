# Linkshelf v2 build plan

Linkshelf v1 (LS-1 to LS-6, `docs/plan.md`) lets one person save, read, filter, and page through links behind one password.
v2 makes it safe, reliable, and fast enough to run in production, and adds the features a real read-it-later shelf needs every day.
You can edit or delete a link and undo a delete, see only unread links, search titles and URLs, bring your browser bookmarks in, and take your data out.
Every PR ships with unit tests, two live lanes that drive the real app in a browser, and a perf check.
The PRs, in order, are LS-7 login rate limit and the v2 schema, LS-8 edit and delete, LS-9 unread view, LS-10 search, LS-11 import and export, and LS-12 production hardening.

## How to read this

The rules of `docs/plan.md` apply unchanged. One box is one unit of work, every box names its evidence, and a box is checked only when its evidence exists. "Trunk" in a lane or a perf block means the PR's base: `main` for LS-7, the parent PR's branch for every later PR.

The operator ran v2 overnight with full autonomy and these standing directions:

- One Claude Code cloud session owns every PR. It runs the unit tests, both live lanes (as subagents), and the perf check itself. There is no separate root session.
- No agent merges, pushes to `main`, or deploys. Every PR opens ready and stops there.
- The review gate has no video. Each PR body records each lane's result and what its screenshot shows.
- A scheduled task wakes the session every 2 hours so a usage reset does not end the run.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

- [ ] Write this plan and open it as its own PR into `main`.
- [ ] Build LS-7 to LS-12 in order as one linear stack. LS-7 branches from `plan-v2`, and each later PR branches from its parent's branch and targets it.
- [ ] Hold the file boundaries. Only LS-7 touches `db/schema.ts` and `drizzle/**`. Every PR touches only the paths its **Files.** block lists.
- [ ] Every PR runs `npm run ci`, its two live lanes, and its perf block at its head SHA, and records each result in its PR body.
- [ ] Land bottom-up. v1 showed that GitHub retargets a stacked PR to `main` only when its old base branch is deleted. After each merge, delete the merged branch or retarget the next PR to `main` before merging it. The scheduled task retargets any child whose parent has merged.

The boot recipe for every live lane is the one in `docs/plan.md`, driven through `.claude/skills/verify/SKILL.md`. Run every `psql`, `createdb`, and `dropdb` with `PGPASSWORD` exported and stdin from `/dev/null`, so none can stop on a password prompt.

## Throttle failed sign-ins and add the v2 schema (LS-7)

**Why.** The public login has no rate limit, so anyone can guess the password at full speed. `docs/plan.md` Appendix C lists this as an open risk.

**Files.**

- [ ] Create `lib/rate-limit.ts`, `db/login-failures.ts`, `test/rate-limit.test.ts`, `test/login-failures.db.test.ts`, `e2e/rate-limit.spec.ts`, and one new migration under `drizzle/`.
- [ ] Edit `db/schema.ts`, `app/login/actions.ts`, `app/login/page.tsx`, `.env.example`, and `scripts/perf-db.ts`.

**Build.**

- [ ] Add the table `login_failures (id bigserial primary key, client text not null, failed_at timestamptz not null default now())` with the index `login_failures_client_failed_at_idx (client, failed_at desc)`.
- [ ] The same migration creates the extension `pg_trgm` and the indexes later PRs need, because one migration per feature PR conflicts in a stack. They are `links_title_trgm_idx` and `links_url_trgm_idx` (GIN, `gin_trgm_ops`) for LS-10, and the partial index `links_unread_created_at_id_idx on links (created_at desc, id desc) where read_at is null` for LS-9.
- [ ] Write the pure rule in `lib/rate-limit.ts`: `MAX_FAILURES = 5`, `WINDOW_MS = 15 minutes`, and `decide(failureTimes, now)`, which returns `{ allowed: true }` or `{ allowed: false, retryAfterMs }`.
- [ ] Write `clientKey(headers)` in `lib/rate-limit.ts`. It takes the first `x-forwarded-for` entry, then `x-real-ip`, then `unknown`. It trims the value and caps it at 64 characters.
- [ ] Add `recentFailures(client, since)`, `recordFailure(client)`, and `clearFailures(client)` to `db/login-failures.ts`. `recordFailure` also deletes rows older than one day, so the table stays small.
- [ ] In `app/login/actions.ts`, check the limit before the password. A blocked client gets `Too many attempts. Try again in <n> minutes.` and the password is not checked. A wrong password records a failure. A right password clears the client's failures.
- [ ] Remove the "no rate limit yet" note from `.env.example`. Keep the advice to use a long random password.
- [ ] Add `--op login-check` to `scripts/perf-db.ts`. It times `recentFailures` against 10,000 failure rows.

**You see.**

- [ ] Five wrong passwords in a row, then a sixth attempt, even with the right password, shows `Too many attempts. Try again in 15 minutes.`.

**Verify, unit.**

- [ ] `test/rate-limit.test.ts` covers four cases. Four failures allow. Five failures in the window block, with `retryAfterMs` counted from the oldest failure. Failures older than the window do not count. `clientKey` picks the first forwarded address and falls back to `unknown`.
- [ ] `test/login-failures.db.test.ts` covers three cases. `recordFailure` then `recentFailures` returns the row. `clearFailures` removes only that client's rows. Rows older than a day are pruned on the next `recordFailure`.
- [ ] `e2e/rate-limit.spec.ts` covers two cases. The sixth attempt is blocked even with the right password. A right password before the limit signs in and clears the count.

**Verify, live.**

- [ ] Lane 1, regression against trunk. Sign in, save a link, and mark it read at trunk and head. Pass when both give the same messages and rows. Then, at head, sign out and submit five wrong passwords and then the right one. Save `rate-limited.png`. Pass when the sixth attempt shows the blocked message and `login_failures` holds 5 rows for the client.
- [ ] Lane 2. At head, submit two wrong passwords, then the right one, then sign out and submit four wrong passwords. Save `rate-reset.png`. Pass when the right password signs in, `login_failures` is empty for the client after it, and the four later failures still show `Wrong password` rather than the blocked message.

**Verify, perf.**

- [ ] Metric. `recentFailures` p50 against 10,000 failure rows, and signed-in `GET /` p50 at trunk and head.
- [ ] Rule. Fail when `recentFailures` p50 exceeds 5 ms, or when head `GET /` p50 exceeds trunk p50 by more than 10 percent.

## Edit and delete a link, with undo (LS-8)

**Why.** A saved link can only be changed by saving its URL again, and it can never be removed.

**Files.**

- [ ] Create `app/edit-link.tsx` and `e2e/edit-delete.spec.ts`.
- [ ] Edit `db/links.ts`, `app/actions.ts`, `app/link-row.tsx`, `scripts/perf-db.ts`, and `test/links.db.test.ts`.

**Build.**

- [ ] Add `updateLink(id, { title, tags })` to `db/links.ts`. It returns whether a row matched, and it never changes `url`, `read_at`, or `created_at`.
- [ ] Add `deleteLink(id)`, which returns the deleted row or `null`, and `restoreLink(row)`, which inserts the row back with its original `id`, `read_at`, and `created_at`. `restoreLink` uses `on conflict do nothing` and returns `false` when the URL was saved again in the meantime.
- [ ] Add the `editLink`, `removeLink`, and `undoRemove` server actions. Each calls `requireSession()` first. `editLink` validates the title and tags with the `parseLinkInput` rules and returns field errors.
- [ ] In `app/link-row.tsx`, each row gets **Edit** and **Delete**. **Edit** swaps the row for the form in `app/edit-link.tsx`, with **Save** and **Cancel**. **Delete** removes the row and shows `Deleted <title>.` with an **Undo** button.
- [ ] Add `--op update` and `--op delete-restore` to `scripts/perf-db.ts`.

**You see.**

- [ ] Editing a title updates the row in place. Deleting a row shows `Deleted <title>. Undo`, and **Undo** brings it back with its read state and its place in the list.

**Verify, unit.**

- [ ] `test/links.db.test.ts` gains five cases. `updateLink` changes the title and tags and keeps `url`, `read_at`, and `created_at`. An unknown id returns `false`. `deleteLink` then `restoreLink` gives back an identical row. `restoreLink` returns `false` when the URL was saved again in between. `deleteLink` of an unknown id returns `null`.
- [ ] `e2e/edit-delete.spec.ts` covers three cases. Edit saves a new title and new tags. An empty title shows the field error and changes nothing. Delete then **Undo** restores the row in its original position.

**Verify, live.**

- [ ] Lane 1, regression against trunk. Seed 25 links and compare page 1 at trunk and head. Then, at head, edit `Link 25` to `Edited` with tags `a, b` and reload. Save `edited.png`. Pass when page 1 matches trunk before the edit, and after the reload the top row reads `Edited` with tags `a` and `b`.
- [ ] Lane 2. At head, mark `Link 25` read, delete it, and click **Undo**. Then delete `Link 24` and reload. Save `deleted.png`. Pass when the restored `Link 25` keeps its original `read_at` and `created_at` and is still the top row, `Link 24` is gone after the reload, and `server.log` holds no error.

**Verify, perf.**

- [ ] Metric. `updateLink` p50 and `deleteLink` plus `restoreLink` p50 against 10,000 links, and signed-in `GET /` p50 at trunk and head.
- [ ] Rule. Fail when either operation's p50 exceeds 5 ms, or when head `GET /` p50 exceeds trunk p50 by more than 10 percent.

## Show only unread links (LS-9)

**Why.** A read-it-later list is a queue. You need to see what is left to read and how much of it there is.

**Files.**

- [ ] Edit `lib/list-query.ts`, `db/links.ts`, `app/page.tsx`, `app/pager.tsx`, `app/link-row.tsx`, `test/list-query.test.ts`, and `test/links.db.test.ts`.
- [ ] Create `e2e/unread.spec.ts`.

**Build.**

- [ ] `ListQuery` gains `state: "all" | "unread"`, parsed from `?state=`. Any value other than `unread` gives `all`.
- [ ] `listHref` keeps `tag` and `state` and sets `page`. Tag links keep `state` and drop `page`. **Clear filter** keeps `state`.
- [ ] `listLinks` adds `read_at is null` when the state is `unread`, so Postgres can use `links_unread_created_at_id_idx`.
- [ ] Add `countUnread()` to `db/links.ts`. The header shows `<n> unread` with **Unread only** and **All** links.
- [ ] An unread view with nothing left shows `Nothing left to read`.

**You see.**

- [ ] **Unread only** hides read links, and the pager counts only unread links. Marking a link read in the unread view removes it from the list on the next render.

**Verify, unit.**

- [ ] `test/list-query.test.ts` gains a table. `?state=unread` gives `unread`, and `?state=`, `?state=READ`, and a missing state give `all`. `listHref` keeps `tag` and `state`.
- [ ] `test/links.db.test.ts` gains three cases. The unread state returns only rows with a null `read_at`, newest first. `total` counts only unread rows. `countUnread` matches the unread total with and without a tag.
- [ ] `e2e/unread.spec.ts` covers two cases. **Unread only** hides a read link and keeps `?state=unread` across the pager. Marking the last unread link read shows `Nothing left to read`.

**Verify, live.**

- [ ] Lane 1, regression against trunk. Seed 45 links, mark 10 read, and compare `/` and `/?page=2` at trunk and head. Then, at head, click **Unread only**. Save `unread.png`. Pass when the default pages match trunk row for row, the unread view shows 35 links over 2 pages, and the header shows `35 unread`.
- [ ] Lane 2. At head, open `/?tag=rust&state=unread` with 25 `rust` links of which 5 are read, page to page 2, then mark a row read. Save `unread-filtered.png`. Pass when the pager keeps `tag` and `state`, the counts are 20 links over 1 page, and the marked row leaves the list after its render.

**Verify, perf.**

- [ ] Metric. Signed-in `GET /?state=unread&page=20` p50 with 10,000 links of which half are read, `EXPLAIN` of the unread query, and signed-in `GET /` p50 at trunk and head, since head adds `countUnread`.
- [ ] Rule. Fail when the unread page p50 exceeds 80 ms, when `EXPLAIN` does not use `links_unread_created_at_id_idx`, or when head `GET /` p50 exceeds trunk p50 by more than 10 percent.

## Search titles and URLs (LS-10)

**Why.** Past a few pages, you can no longer find a link you saved.

**Files.**

- [ ] Create `app/search-form.tsx` and `e2e/search.spec.ts`.
- [ ] Edit `lib/list-query.ts`, `db/links.ts`, `app/page.tsx`, `app/link-row.tsx`, `test/list-query.test.ts`, and `test/links.db.test.ts`.

**Build.**

- [ ] `ListQuery` gains `q: string | null`, parsed from `?q=`. The value is trimmed, inner whitespace is collapsed, and it is cut to 100 characters. An empty value gives `null`.
- [ ] `listLinks` adds `(title ilike $p or url ilike $p)` with `$p = '%' || escaped(q) || '%'`, where `escaped` escapes `\`, `%`, and `_`. Postgres can then use the trigram indexes from LS-7.
- [ ] Render `app/search-form.tsx` above the list. It is a GET form with one field, `q`, and it keeps `tag` and `state` as hidden fields. A search shows `Results for "<q>"` with **Clear search**.
- [ ] A search with no results shows `No links match "<q>"`.

**You see.**

- [ ] Typing `rust` and pressing Enter shows only links whose title or URL contains `rust`, in any case. The pager and the tag links keep the search.

**Verify, unit.**

- [ ] `test/list-query.test.ts` gains a table. `?q=  Rust  Book ` gives `Rust Book`. `?q=` gives `null`. A 300-character `q` is cut to 100. `listHref` keeps `q`.
- [ ] `test/links.db.test.ts` gains four cases. A search matches the title in any case. A search matches the URL. `%` and `_` in `q` match only themselves. A search combines with `tag` and `state`.
- [ ] `e2e/search.spec.ts` covers two cases. A search filters the list, and **Clear search** restores it. A search with no match shows the empty message.

**Verify, live.**

- [ ] Lane 1, regression against trunk. Seed 45 links and compare `/` and `/?tag=rust` at trunk and head. Then, at head, search `link 4`. Save `search.png`. Pass when the default views match trunk row for row, and the search shows exactly the links whose titles contain `Link 4` (Link 4 and Link 40 to Link 45), newest first.
- [ ] Lane 2. At head, save `https://example.com/100%_off` titled `Sale`, then search `100%`, `_off`, and `%`. Then search `nothing-matches`. Save `search-empty.png`. Pass when each of the first three searches shows only `Sale`, and the last shows `No links match "nothing-matches"`.

**Verify, perf.**

- [ ] Metric. Signed-in `GET /?q=link%20999` p50 with 10,000 links, `EXPLAIN ANALYZE` of the search query, and signed-in `GET /` p50 at trunk and head.
- [ ] Rule. Fail when the search p50 exceeds 80 ms, when `EXPLAIN` shows a sequential scan on `links` for the search, or when head `GET /` p50 exceeds trunk p50 by more than 10 percent.

## Import browser bookmarks and export the shelf (LS-11)

**Why.** You start with bookmarks in a browser, and you should be able to take your data with you. Without import, the shelf starts empty. Without export, it is a trap.

**Files.**

- [ ] Create `lib/bookmarks.ts`, `app/import/page.tsx`, `app/import/actions.ts`, `app/export/route.ts`, `test/bookmarks.test.ts`, and `e2e/import-export.spec.ts`.
- [ ] Edit `db/links.ts`, `app/page.tsx`, `next.config.ts`, `scripts/perf-db.ts`, and `test/links.db.test.ts`.

**Build.**

- [ ] Write `parseBookmarksHtml(html)` in `lib/bookmarks.ts`. It reads the Netscape bookmark format that Chrome, Firefox, and Safari export. It takes each `<A HREF>` with its text as the title and its `TAGS` attribute as tags, and decodes HTML entities. Each entry goes through `normalizeUrl` and the `parseTags` rules. It returns `{ links: LinkInput[], invalid: number }`.
- [ ] Write `toBookmarksHtml(links)` in `lib/bookmarks.ts`. It escapes every attribute and text node, and its output parses back to the same links.
- [ ] Add `importLinks(inputs)` to `db/links.ts`. It inserts in batches of 500 with `on conflict (url) do nothing`, so an import never overwrites a link you already have. It returns `{ imported, skipped }`.
- [ ] `app/import/page.tsx` has a file field that accepts `.html` files up to 5 MB and at most 10,000 links. The result reads `Imported <n>, skipped <m> already saved, <k> invalid`. Set `serverActions.bodySizeLimit` to `6mb` in `next.config.ts`.
- [ ] `GET /export` returns `linkshelf-<yyyy-mm-dd>.html` with `content-disposition: attachment`. It streams every link in `created_at` order, not only one page.
- [ ] `app/page.tsx` links to **Import** and **Export**.
- [ ] Add `--op import` to `scripts/perf-db.ts`. It times the import of a 10,000-link file.

**You see.**

- [ ] Importing a Chrome bookmarks export adds its links with their titles. **Export** downloads a file that a browser can import, holding every link.

**Verify, unit.**

- [ ] `test/bookmarks.test.ts` covers five cases. It parses a fixture shaped like a Chrome export and one shaped like a Firefox export with `TAGS`. Entities decode. `javascript:` and `ftp:` URLs count as invalid. `toBookmarksHtml` then `parseBookmarksHtml` gives back the same links, including titles with `<`, `&`, and `"`.
- [ ] `test/links.db.test.ts` gains two cases. `importLinks` skips URLs that already exist and keeps their titles. 1,200 inputs import across three batches.
- [ ] `e2e/import-export.spec.ts` covers two cases. Importing a fixture file shows the counts and the new rows. Export downloads a file that parses back to every row in the table.

**Verify, live.**

- [ ] Lane 1, regression against trunk. Seed 25 links and compare `/` at trunk and head. Then, at head, import a generated 2,000-link bookmarks file in which 10 URLs are already saved and 5 are invalid. Save `imported.png`. Pass when `/` matches trunk before the import, the result reads `Imported 1985, skipped 10 already saved, 5 invalid`, and `select count(*) from links` grows by exactly 1985.
- [ ] Lane 2. At head, click **Export** and save the download. Truncate the table, import the downloaded file, and compare the rows. Then upload a 7 MB file. Save `export-roundtrip.png`. Pass when the reimported rows match the exported ones in url, title, and tags, and the 7 MB upload is refused with a clear message and no server crash.

**Verify, perf.**

- [ ] Metric. Import time for 10,000 links, `GET /export` time to last byte with 10,000 links, and signed-in `GET /` p50 at trunk and head.
- [ ] Rule. Fail when the import exceeds 10 s, when the export exceeds 2 s, or when head `GET /` p50 exceeds trunk p50 by more than 10 percent.

## Harden for production (LS-12)

**Why.** v1 crashes with a stack trace when the database goes away, has no error page, opens unbounded database connections on serverless, and sends no security headers.

**Files.**

- [ ] Create `app/error.tsx`, `app/not-found.tsx`, `test/env.test.ts`, and `e2e/hardening.spec.ts`.
- [ ] Edit `db/client.ts`, `lib/env.ts`, `next.config.ts`, `app/api/health/route.ts`, `app/link-row.tsx`, and `.env.example`.

**Build.**

- [ ] `lib/env.ts` gains `DATABASE_POOL_MAX` (an integer from 1 to 50, default 5) and `DATABASE_CONNECT_TIMEOUT_S` (default 10). `db/client.ts` passes `max`, `connect_timeout`, `idle_timeout: 20`, and `max_lifetime: 1800` to `postgres`, so each serverless instance holds a small, bounded pool.
- [ ] `/api/health` answers `503 unavailable` within 2 s when the database does not respond, rather than throwing a 500 with a stack trace.
- [ ] `app/error.tsx` shows `Something went wrong` with **Try again**, and never shows the error message or stack. `app/not-found.tsx` shows `Page not found` with a link to `/`.
- [ ] `next.config.ts` sends these headers on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Strict-Transport-Security: max-age=63072000; includeSubDomains`. It also sets `poweredByHeader: false`.
- [ ] Saved links open in a new tab with `rel="noopener noreferrer"`.
- [ ] `.env.example` documents the two new variables.

**You see.**

- [ ] A missing page shows `Page not found`. Stopping Postgres makes `/api/health` answer `503` in under 2 s, and the server stays up.

**Verify, unit.**

- [ ] `test/env.test.ts` covers three cases. Defaults apply. `DATABASE_POOL_MAX=0` and `=51` fail. A short `SESSION_SECRET` still fails.
- [ ] `e2e/hardening.spec.ts` covers three cases. Every security header is present on `/` and `/login`. `/no-such-page` shows `Page not found`. A saved link has `target="_blank"` and `rel="noopener noreferrer"`.

**Verify, live.**

- [ ] Lane 1, regression against trunk. Seed 45 links and drive save, mark read, filter, search, page, and delete with undo at trunk and head. Save `hardened.png`. Pass when every view matches trunk and `curl -sI` shows every header at head.
- [ ] Lane 2. At head, point a second server at a database URL whose port nothing listens on, then request `/api/health` and `/`. Save `db-down.png`. Pass when health answers `503` in under 2 s, `/` shows `Something went wrong` without a stack or a database message, and the server process stays up.

**Verify, perf.**

- [ ] Metric. Signed-in `GET /` p50 and p95 at trunk and head, and `GET /api/health` p50 at head.
- [ ] Rule. Fail when head `GET /` p50 exceeds trunk p50 by more than 10 percent, or when health p50 exceeds 20 ms.

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with one line per PR: its link, its head SHA, and its verdict.

## Appendix A. Alternatives rejected

- A rate limit in memory or in a proxy. Serverless instances share no memory, so a limit held in one instance does not bind the others. Postgres already holds the state, and failed logins are rare.
- A full-text search column with `tsvector`. Users search partial words and URL fragments such as `github.com/vercel`. Trigram `ilike` matches substrings, and the GIN indexes keep it fast at 10,000 links.
- Soft delete with a `deleted_at` column. It would touch every query and the unique URL. Undo only needs the deleted row for a few seconds, and the client holds it.
- A JSON export. The Netscape bookmark format is what every browser and bookmark service imports, so it is the format that actually lets you leave.
- A content security policy with script nonces. Next.js inline scripts need a per-request nonce and dynamic rendering for every page. The headers above stop clickjacking and MIME sniffing without that cost. A nonce-based CSP is a later step.

## Appendix B. Risks

- Rate limits keyed by IP lock out one shared IP, and an attacker with many IPs gets 5 guesses per IP per 15 minutes. The strong-password advice stays in `.env.example`.
- `x-forwarded-for` can be forged when the app is not behind a proxy that overwrites it. Vercel overwrites it. A self-hosted deploy needs a proxy that does the same.
- An import trusts the browser's titles. Titles are rendered as text, never as HTML, so a hostile title cannot run script.
- Perf numbers on shared cloud hardware are noisy. Each probe interleaves trunk and head, takes 100 samples, and drops warm-up requests. A failing number is rerun once before it counts.
