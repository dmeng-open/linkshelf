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

const total = Number(values.links);
const tagged = Number(values.tagged);
const tag = values.tag;

if (!Number.isInteger(total) || !Number.isInteger(tagged) || !tag || tagged < 0 || tagged > total) {
  throw new Error("usage: seed.ts --links <N> --tagged <M> --tag <name>, with 0 <= M <= N");
}

const start = Date.UTC(2025, 0, 1);
const rows = Array.from({ length: total }, (_, i) => ({
  url: `https://example.com/links/${i + 1}`,
  title: `Link ${i + 1}`,
  tags: i >= total - tagged ? [tag] : [],
  createdAt: new Date(start + (i + 1) * 60_000),
}));

async function main() {
  await db.execute(raw`truncate table links`);
  for (let i = 0; i < rows.length; i += 1000) {
    await db.insert(links).values(rows.slice(i, i + 1000));
  }
  await sql.end();
}

main();
