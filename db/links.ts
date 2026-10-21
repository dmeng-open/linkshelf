import { desc, sql } from "drizzle-orm";
import { isLinkId, type LinkId, type LinkInput } from "../lib/link";
import { db } from "./client";
import { links, type Link } from "./schema";

export function listLinks(): Promise<Link[]> {
  return db.select().from(links).orderBy(desc(links.createdAt), desc(links.id)).limit(20);
}

export async function upsertLink(input: LinkInput): Promise<{ id: LinkId; outcome: "created" | "updated" }> {
  const [row] = await db
    .insert(links)
    .values(input)
    .onConflictDoUpdate({
      target: links.url,
      set: { title: input.title, tags: input.tags, updatedAt: sql`now()` },
    })
    .returning({ id: links.id, inserted: sql<boolean>`(xmax = 0)` });
  if (!row || !isLinkId(row.id)) throw new Error("upsert returned no valid id");
  return { id: row.id, outcome: row.inserted ? "created" : "updated" };
}
