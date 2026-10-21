"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearFailures, recentFailures, recordFailure } from "@/db/login-failures";
import { clientKey, decide, WINDOW_MS } from "@/lib/rate-limit";
import { SESSION_COOKIE, SESSION_TTL_MS, checkPassword, createSessionToken, safeNext } from "@/lib/session";

export async function login(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const client = clientKey(await headers());
  const now = new Date();

  const decision = decide(await recentFailures(client, new Date(now.getTime() - WINDOW_MS)), now);
  if (!decision.allowed) {
    const minutes = String(Math.max(1, Math.ceil(decision.retryAfterMs / 60_000)));
    redirect(`/login?${new URLSearchParams({ error: "limited", minutes, next })}`);
  }

  if (!(await checkPassword(String(formData.get("password") ?? "")))) {
    await recordFailure(client);
    redirect(`/login?${new URLSearchParams({ error: "1", next })}`);
  }

  await clearFailures(client);
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(now), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
    secure: process.env.NODE_ENV === "production",
  });
  redirect(next);
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
