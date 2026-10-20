import { sql as raw } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { db, sql } from "../db/client";

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
});

beforeEach(async () => {
  await db.execute(raw`truncate table links`);
});

afterAll(async () => {
  await sql.end();
});
