import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SESSION_TTL_MS, checkPassword, createSessionToken, verifySessionToken } from "../lib/session";

const now = new Date(Date.UTC(2026, 0, 1));
const later = (ms: number) => new Date(now.getTime() + ms);

describe("session tokens", () => {
  it("verifies a fresh token", async () => {
    expect(await verifySessionToken(await createSessionToken(now), now)).toBe(true);
  });

  it("rejects a token after it expires", async () => {
    const token = await createSessionToken(now);
    expect(await verifySessionToken(token, later(SESSION_TTL_MS - 1))).toBe(true);
    expect(await verifySessionToken(token, later(SESSION_TTL_MS))).toBe(false);
  });

  it("rejects a token signed under another secret", async () => {
    const payload = `v1.${now.getTime() + SESSION_TTL_MS}`;
    const signature = createHmac("sha256", "another-secret-0123456789abcdef0123").update(payload).digest("base64url");
    expect(await verifySessionToken(`${payload}.${signature}`, now)).toBe(false);
  });

  it("rejects a token whose expiresAt or signature was edited", async () => {
    const token = await createSessionToken(now);
    const [version, expiresAt, signature] = token.split(".");
    expect(await verifySessionToken(`${version}.${Number(expiresAt) + SESSION_TTL_MS}.${signature}`, now)).toBe(false);

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const lastCharEdits = [...alphabet].filter((c) => c !== token.at(-1)).map((c) => token.slice(0, -1) + c);
    const verified = await Promise.all(lastCharEdits.map((edited) => verifySessionToken(edited, now)));
    expect(verified.filter(Boolean)).toHaveLength(0);
  });
});

describe("checkPassword", () => {
  it("accepts the right password", async () => {
    expect(await checkPassword(process.env.LINKSHELF_PASSWORD!)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    expect(await checkPassword("wrong")).toBe(false);
  });
});
