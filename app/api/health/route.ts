import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 2000;

export async function GET() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("health check timed out")), TIMEOUT_MS);
  });
  try {
    await Promise.race([db.execute(sql`select 1`), timeout]);
    return new Response("ok");
  } catch (error) {
    console.error("health check failed", error instanceof Error ? error.message : error);
    return new Response("unavailable", { status: 503, headers: { "retry-after": "5" } });
  } finally {
    clearTimeout(timer);
  }
}
