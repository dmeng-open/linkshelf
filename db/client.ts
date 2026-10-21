import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env";

export const sql = postgres(env.DATABASE_URL, {
  max: env.DATABASE_POOL_MAX,
  connect_timeout: env.DATABASE_CONNECT_TIMEOUT_S,
  idle_timeout: 20,
  max_lifetime: 30 * 60,
});
export const db = drizzle(sql);
