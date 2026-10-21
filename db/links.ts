import { type AnyColumn, arrayContains, desc, eq, sql } from "drizzle-orm";
import type { LinkId, LinkInput } from "../lib/link";
import { PAGE_SIZE, type ListQuery } from "../lib/list-query";
import { db } from "./client";
import { links, type Link } from "./schema";

export async function listLinks({ tag, page }: ListQuery): Promise<{ links: Link[]; total: number }> {
  const filter = tag === null ? undefined : arrayContains(links.tags, [tag]);
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(links)
      .where(filter)
      .orderBy(desc(links.createdAt), desc(links.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.$count(links, filter),
  ]);
  return { links: rows, total };
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

export async function updateLink(id: LinkId, { title, tags }: Pick<LinkInput, "title" | "tags">): Promise<boolean> {
  const rows = await db
    .update(links)
    .set({ title, tags, updatedAt: sql`now()` })
    .where(eq(links.id, id))
    .returning({ id: links.id });
  return rows.length > 0;
}

export type DeletedLink = Omit<Link, "readAt" | "createdAt" | "updatedAt"> & {
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const exactTime = <T extends string | null>(column: AnyColumn) =>
  sql<T>`to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export async function deleteLink(id: LinkId): Promise<DeletedLink | null> {
  const [row] = await db
    .delete(links)
    .where(eq(links.id, id))
    .returning({
      id: links.id,
      url: links.url,
      title: links.title,
      tags: links.tags,
      readAt: exactTime<string | null>(links.readAt),
      createdAt: exactTime<string>(links.createdAt),
      updatedAt: exactTime<string>(links.updatedAt),
    });
  return row ?? null;
}

export async function restoreLink(row: DeletedLink): Promise<boolean> {
  const restored = await db
    .insert(links)
    .values({
      ...row,
      readAt: row.readAt === null ? null : sql`${row.readAt}::timestamptz`,
      createdAt: sql`${row.createdAt}::timestamptz`,
      updatedAt: sql`${row.updatedAt}::timestamptz`,
    })
    .onConflictDoNothing()
    .returning({ id: links.id });
  return restored.length > 0;
}
