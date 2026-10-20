import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
  ],
);

export type Link = typeof links.$inferSelect;
