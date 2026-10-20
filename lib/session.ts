import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";

export const SESSION_COOKIE = "ls_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

const hmacKey = crypto.subtle.importKey(
  "raw",
  encoder.encode(env.SESSION_SECRET),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

function toBase64Url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64url");
}

export async function createSessionToken(now: Date): Promise<string> {
  const payload = `v1.${now.getTime() + SESSION_TTL_MS}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey, encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(token: string | undefined, now: Date): Promise<boolean> {
  const match = token?.match(/^(v1\.(\d{1,15}))\.([A-Za-z0-9_-]{43})$/);
  if (!match) return false;
  const [, payload, expiresAt, signature] = match;
  const signatureBytes = Buffer.from(signature, "base64url");
  if (signatureBytes.toString("base64url") !== signature) return false;
  const valid = await crypto.subtle.verify("HMAC", await hmacKey, signatureBytes, encoder.encode(payload));
  return valid && Number(expiresAt) > now.getTime();
}

export async function checkPassword(input: string): Promise<boolean> {
  const [given, expected] = await Promise.all(
    [input, env.LINKSHELF_PASSWORD].map(async (value) =>
      new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))),
    ),
  );
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given[i] ^ expected[i];
  return diff === 0;
}

export async function hasSession(): Promise<boolean> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value, new Date());
}

export async function requireSession(): Promise<void> {
  if (!(await hasSession())) redirect("/login");
}

const SAME_ORIGIN = "http://linkshelf.invalid";

export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/")) return "/";
  const url = new URL(next, SAME_ORIGIN);
  return url.origin === SAME_ORIGIN ? url.pathname + url.search + url.hash : "/";
}
