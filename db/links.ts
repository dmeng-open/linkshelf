import { arrayContains, desc, eq, sql } from "drizzle-orm";
import type { LinkId, LinkInput, Tag } from "../lib/link";
import { db } from "./client";
import { links, type Link } from "./schema";

export function listLinks({ tag }: { tag: Tag | null }): Promise<Link[]> {
  return db
    .select()
    .from(links)
    .where(tag === null ? undefined : arrayContains(links.tags, [tag]))
    .orderBy(desc(links.createdAt), desc(links.id))
    .limit(20);
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
  if (!row) throw new Error("upsert returned no row");
  return { id: row.id as LinkId, outcome: row.inserted ? "created" : "updated" };
}

export async function setRead(id: LinkId, read: boolean): Promise<boolean> {
  const rows = await db
    .update(links)
    .set({ readAt: sql`case when ${read} then coalesce(${links.readAt}, now()) else null end` })
    .where(eq(links.id, id))
    .returning({ id: links.id });
  return rows.length > 0;
}
