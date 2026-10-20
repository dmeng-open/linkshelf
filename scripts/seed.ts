import { parseArgs } from "node:util";
import { sql as raw } from "drizzle-orm";
import { db, sql } from "../db/client";
import { links } from "../db/schema";

const { values } = parseArgs({
  options: {
    links: { type: "string" },
    tagged: { type: "string" },
    tag: { type: "string" },
  },
});

const count = (value: string | undefined) => (value && /^\d+$/.test(value) ? Number(value) : NaN);
const total = count(values.links);
const tagged = count(values.tagged);
const tag = values.tag;

if (!Number.isInteger(total) || !Number.isInteger(tagged) || !tag || tagged > total) {
  throw new Error("usage: seed.ts --links <N> --tagged <M> --tag <name>, with 0 <= M <= N");
}

const start = Date.UTC(2025, 0, 1);
const rows = Array.from({ length: total }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  url: `https://example.com/links/${i + 1}`,
  title: `Link ${i + 1}`,
  tags: i >= total - tagged ? [tag] : [],
  createdAt: new Date(start + (i + 1) * 60_000),
  updatedAt: new Date(start + (i + 1) * 60_000),
}));

async function main() {
  await db.execute(raw`truncate table links`);
  for (let i = 0; i < rows.length; i += 1000) {
    await db.insert(links).values(rows.slice(i, i + 1000));
  }
  await sql.end();
}

main();
