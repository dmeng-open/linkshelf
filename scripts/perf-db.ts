import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { eq, like } from "drizzle-orm";
import { db, sql } from "../db/client";
import { upsertLink } from "../db/links";
import { links } from "../db/schema";
import { normalizeUrl, type LinkInput } from "../lib/link";

const WARMUP = 5;

const { values } = parseArgs({
  options: {
    op: { type: "string" },
    n: { type: "string" },
  },
});

const n = values.n && /^\d+$/.test(values.n) ? Number(values.n) : NaN;
if (values.op !== "upsert" || !Number.isInteger(n) || n < 1) {
  throw new Error("usage: perf-db.ts --op upsert --n <count>");
}

function link(url: string, title: string): LinkInput {
  const normalized = normalizeUrl(url);
  if (normalized === null) throw new Error(`not a normalizable url: ${url}`);
  return { url: normalized, title, tags: [] };
}

const percentile = (sorted: number[], p: number) => sorted[Math.ceil(p * sorted.length) - 1];
const round = (ms: number) => Math.round(ms * 100) / 100;

async function main() {
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

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
