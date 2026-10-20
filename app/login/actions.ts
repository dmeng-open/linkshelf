"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_MS, checkPassword, createSessionToken, safeNext } from "@/lib/session";

export async function login(formData: FormData) {
  const next = safeNext(formData.get("next"));
  if (!(await checkPassword(String(formData.get("password") ?? "")))) {
    redirect(`/login?${new URLSearchParams({ error: "1", next })}`);
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(new Date()), {
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
