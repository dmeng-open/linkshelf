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

  it("rejects a token whose expiresAt was edited", async () => {
    const [version, expiresAt, signature] = (await createSessionToken(now)).split(".");
    const edited = `${version}.${Number(expiresAt) + SESSION_TTL_MS}.${signature}`;
    expect(await verifySessionToken(edited, now)).toBe(false);
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
