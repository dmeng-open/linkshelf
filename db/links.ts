import { desc } from "drizzle-orm";
import { db } from "./client";
import { links, type Link } from "./schema";

export function listLinks(): Promise<Link[]> {
  return db.select().from(links).orderBy(desc(links.createdAt), desc(links.id)).limit(20);
}
