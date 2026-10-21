import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import { MAX_FAILURES } from "../lib/rate-limit";
import { db } from "./client";
import { loginFailures } from "./schema";

export async function recentFailures(client: string, since: Date): Promise<Date[]> {
  const rows = await db
    .select({ failedAt: loginFailures.failedAt })
    .from(loginFailures)
    .where(and(eq(loginFailures.client, client), gt(loginFailures.failedAt, since)))
    .orderBy(desc(loginFailures.failedAt))
    .limit(MAX_FAILURES);
  return rows.map((row) => row.failedAt);
}

export async function recordFailure(client: string): Promise<void> {
  await db.insert(loginFailures).values({ client });
  await db.delete(loginFailures).where(lt(loginFailures.failedAt, sql`now() - interval '1 day'`));
}

export async function clearFailures(client: string): Promise<void> {
  await db.delete(loginFailures).where(eq(loginFailures.client, client));
}
