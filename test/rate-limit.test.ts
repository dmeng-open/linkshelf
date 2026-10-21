import { describe, expect, it } from "vitest";
import { clientKey, decide, MAX_FAILURES, WINDOW_MS } from "../lib/rate-limit";

const now = new Date(Date.UTC(2025, 0, 1, 12));
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe("decide", () => {
  it("allows four failures", () => {
    expect(decide([1, 2, 3, 4].map(minutesAgo), now)).toEqual({ allowed: true });
  });

  it("blocks five failures in the window until the oldest leaves it", () => {
    expect(decide([1, 2, 3, 4, 10].map(minutesAgo), now)).toEqual({
      allowed: false,
      retryAfterMs: WINDOW_MS - 10 * 60_000,
    });
  });

  it("ignores failures older than the window", () => {
    expect(decide([1, 2, 3, 4, 16, 20].map(minutesAgo), now)).toEqual({ allowed: true });
    expect(MAX_FAILURES).toBe(5);
  });
});

describe("clientKey", () => {
  it.each<[string, Record<string, string>, string]>([
    ["the first forwarded address", { "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" }, "203.0.113.7"],
    ["x-real-ip without a forwarded header", { "x-real-ip": "198.51.100.2" }, "198.51.100.2"],
    ["unknown without either header", {}, "unknown"],
    ["a 64-character cap", { "x-forwarded-for": "a".repeat(100) }, "a".repeat(64)],
  ])("uses %s", (_, headers, key) => {
    expect(clientKey(new Headers(headers))).toBe(key);
  });
});
