export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export type Decision = { allowed: true } | { allowed: false; retryAfterMs: number };

export function decide(failureTimes: Date[], now: Date): Decision {
  const windowStart = now.getTime() - WINDOW_MS;
  const recent = failureTimes.map((t) => t.getTime()).filter((t) => t > windowStart);
  if (recent.length < MAX_FAILURES) return { allowed: true };
  const oldest = recent.sort((a, b) => b - a)[MAX_FAILURES - 1];
  return { allowed: false, retryAfterMs: oldest + WINDOW_MS - now.getTime() };
}

export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || headers.get("x-real-ip")?.trim() || "unknown";
  return key.slice(0, 64);
}
