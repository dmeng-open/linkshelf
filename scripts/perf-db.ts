import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { eq, inArray, isNull, like } from "drizzle-orm";
import { db, sql } from "../db/client";
import { recentFailures } from "../db/login-failures";
import { deleteLink, restoreLink, setRead, updateLink, upsertLink } from "../db/links";
import { links, loginFailures } from "../db/schema";
import { normalizeUrl, type LinkId, type LinkInput } from "../lib/link";

const WARMUP = 5;

const { values } = parseArgs({
  options: {
    op: { type: "string" },
    n: { type: "string" },
  },
});

const n = values.n && /^\d+$/.test(values.n) ? Number(values.n) : NaN;
const op = values.op;
const OPS = ["upsert", "set-read", "login-check", "update", "delete-restore"] as const;
if (!OPS.includes(op as (typeof OPS)[number]) || !Number.isInteger(n) || n < 1) {
  throw new Error(`usage: perf-db.ts --op ${OPS.join("|")} --n <count>`);
}

function link(url: string, title: string): LinkInput {
  const normalized = normalizeUrl(url);
  if (normalized === null) throw new Error(`not a normalizable url: ${url}`);
  return { url: normalized, title, tags: [] };
}

const percentile = (sorted: number[], p: number) => sorted[Math.ceil(p * sorted.length) - 1];
const round = (ms: number) => Math.round(ms * 100) / 100;

async function timeUpsert() {
  const runId = randomUUID();
  const insertedPrefix = `https://example.com/perf-db/${runId}/`;
  const seededUrl = (k: number) => `https://example.com/links/${k}`;
  const total = WARMUP + n;
  const lastSeeded = Math.floor(total / 2);

  const [seeded] = await db.select({ id: links.id }).from(links).where(eq(links.url, seededUrl(lastSeeded)));
  if (!seeded) throw new Error(`seed the table first: ${seededUrl(lastSeeded)} is missing`);

  const timings: number[] = [];
  const outcomes = { created: 0, updated: 0 };
  try {
    for (let i = 0; i < total; i++) {
      const input =
        i % 2 === 0
          ? link(`${insertedPrefix}${i}`, `Perf ${i}`)
          : link(seededUrl((i + 1) / 2), `Link ${(i + 1) / 2}`);
      const start = performance.now();
      const { outcome } = await upsertLink(input);
      const elapsed = performance.now() - start;
      if (i >= WARMUP) {
        timings.push(elapsed);
        outcomes[outcome]++;
      }
    }
  } finally {
    await db.delete(links).where(like(links.url, `${insertedPrefix}%`));
    await sql.end();
  }

  const sorted = timings.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      op: "upsert",
      n,
      ...outcomes,
      p50: round(percentile(sorted, 0.5)),
      p95: round(percentile(sorted, 0.95)),
    }),
  );
}

async function timeSetRead() {
  const total = WARMUP + n;
  const unread = await db.select({ id: links.id }).from(links).where(isNull(links.readAt)).limit(total);
  if (unread.length < total) throw new Error(`seed the table first: need ${total} unread links, found ${unread.length}`);
  const ids = unread.map((row) => row.id as LinkId);

  const timings: number[] = [];
  let matched = 0;
  try {
    for (let i = 0; i < total; i++) {
      const start = performance.now();
      const found = await setRead(ids[i], i % 2 === 0);
      const elapsed = performance.now() - start;
      if (i >= WARMUP) {
        timings.push(elapsed);
        if (found) matched++;
      }
    }
  } finally {
    await db.update(links).set({ readAt: null }).where(inArray(links.id, ids));
    await sql.end();
  }

  const sorted = timings.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      op: "set-read",
      n,
      matched,
      p50: round(percentile(sorted, 0.5)),
      p95: round(percentile(sorted, 0.95)),
    }),
  );
}

async function timeLoginCheck() {
  const runId = randomUUID();
  const clients = Array.from({ length: 1000 }, (_, i) => `perf-${runId}-${i}`);
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const timings: number[] = [];
  try {
    for (let i = 0; i < 10; i++) await db.insert(loginFailures).values(clients.map((client) => ({ client })));
    for (let i = 0; i < WARMUP + n; i++) {
      const start = performance.now();
      await recentFailures(clients[i % clients.length], since);
      const elapsed = performance.now() - start;
      if (i >= WARMUP) timings.push(elapsed);
    }
  } finally {
    await db.delete(loginFailures).where(like(loginFailures.client, `perf-${runId}-%`));
    await sql.end();
  }

  const sorted = timings.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      op: "login-check",
      n,
      failureRows: clients.length * 10,
      p50: round(percentile(sorted, 0.5)),
      p95: round(percentile(sorted, 0.95)),
    }),
  );
}

async function timeOnSeeded(name: string, run: (id: LinkId) => Promise<void>) {
  const total = WARMUP + n;
  const rows = await db.select().from(links).where(like(links.url, "https://example.com/links/%")).limit(total);
  if (rows.length < total) throw new Error(`seed the table first: need ${total} seeded links, found ${rows.length}`);

  const timings: number[] = [];
  try {
    for (let i = 0; i < total; i++) {
      const start = performance.now();
      await run(rows[i].id as LinkId);
      const elapsed = performance.now() - start;
      if (i >= WARMUP) timings.push(elapsed);
    }
  } finally {
    for (const row of rows) {
      await db.insert(links).values(row).onConflictDoUpdate({ target: links.id, set: { title: row.title, tags: row.tags, updatedAt: row.updatedAt } });
    }
    await sql.end();
  }

  const sorted = timings.sort((a, b) => a - b);
  console.log(JSON.stringify({ op: name, n, p50: round(percentile(sorted, 0.5)), p95: round(percentile(sorted, 0.95)) }));
}

async function timeUpdate() {
  await timeOnSeeded("update", async (id) => {
    if (!(await updateLink(id, { title: "Perf edit", tags: [] }))) throw new Error(`no row ${id}`);
  });
}

async function timeDeleteRestore() {
  await timeOnSeeded("delete-restore", async (id) => {
    const row = await deleteLink(id);
    if (!row || !(await restoreLink(row))) throw new Error(`could not delete and restore ${id}`);
  });
}

const main = {
  upsert: timeUpsert,
  "set-read": timeSetRead,
  "login-check": timeLoginCheck,
  update: timeUpdate,
  "delete-restore": timeDeleteRestore,
}[op as (typeof OPS)[number]];

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
