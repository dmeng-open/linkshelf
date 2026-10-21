import { sql } from "drizzle-orm";
import { bigserial, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull().unique(),
    title: text("title").notNull(),
    tags: text("tags").array().notNull().default([]),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("links_tags_gin_idx").using("gin", t.tags),
    index("links_created_at_id_idx").on(t.createdAt.desc().nullsFirst(), t.id.desc().nullsFirst()),
    index("links_unread_created_at_id_idx")
      .on(t.createdAt.desc().nullsFirst(), t.id.desc().nullsFirst())
      .where(sql`${t.readAt} is null`),
    index("links_title_trgm_idx").using("gin", t.title.op("gin_trgm_ops")),
    index("links_url_trgm_idx").using("gin", t.url.op("gin_trgm_ops")),
  ],
);

export type Link = typeof links.$inferSelect;

export const loginFailures = pgTable(
  "login_failures",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    client: text("client").notNull(),
    failedAt: timestamp("failed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_failures_client_failed_at_idx").on(t.client, t.failedAt.desc())],
);
