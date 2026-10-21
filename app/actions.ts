"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteLink, restoreLink, setRead, updateLink, upsertLink, type DeletedLink } from "@/db/links";
import { env } from "@/lib/env";
import { parseLinkInput, type LinkErrors, type LinkFields, type LinkId } from "@/lib/link";
import { requireSession, safeNext } from "@/lib/session";

export type SaveState =
  | { status: "idle" }
  | { status: "saved"; outcome: "created" | "updated"; title: string }
  | { status: "invalid"; errors: LinkErrors; values: LinkFields };

export async function saveLink(_prev: SaveState, formData: FormData): Promise<SaveState> {
  await requireSession();
  const parsed = parseLinkInput(formData);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors, values: parsed.values };

  const { outcome } = await upsertLink(parsed.value);
  revalidatePath("/");
  return { status: "saved", outcome, title: parsed.value.title };
}

const linkId = z.uuid().transform((id) => id as LinkId);

export async function setLinkRead(formData: FormData): Promise<void> {
  await requireSession();
  const id = linkId.safeParse(formData.get("id"));
  if (!id.success) return;

  await setRead(id.data, formData.get("read") === "true");
  revalidateFrom(formData.get("path"));
}

function revalidateFrom(path: unknown) {
  const { pathname, search } = new URL(safeNext(path), "http://linkshelf.invalid");
  revalidatePath(pathname + search);
}

export type EditState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "invalid"; errors: LinkErrors; values: LinkFields }
  | { status: "missing" };

export async function editLink(_prev: EditState, formData: FormData): Promise<EditState> {
  await requireSession();
  const id = linkId.safeParse(formData.get("id"));
  if (!id.success) return { status: "missing" };
  const parsed = parseLinkInput(formData);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors, values: parsed.values };

  const found = await updateLink(id.data, parsed.value);
  revalidateFrom(formData.get("path"));
  return found ? { status: "saved" } : { status: "missing" };
}

const UNDO_TTL_MS = 10 * 60 * 1000;

function undoSignature(payload: string): Buffer {
  return createHmac("sha256", env.SESSION_SECRET).update(`undo:${payload}`).digest();
}

export async function removeLink(id: string): Promise<string | null> {
  await requireSession();
  const parsed = linkId.safeParse(id);
  const row = parsed.success ? await deleteLink(parsed.data) : null;
  if (row === null) return null;
  const payload = Buffer.from(JSON.stringify({ row, deletedAt: Date.now() })).toString("base64url");
  return `${payload}.${undoSignature(payload).toString("base64url")}`;
}

function readUndoToken(token: unknown): DeletedLink | null {
  if (typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const given = Buffer.from(signature, "base64url");
  const expected = undoSignature(payload);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const { row, deletedAt } = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
    row: DeletedLink;
    deletedAt: number;
  };
  return Date.now() - deletedAt <= UNDO_TTL_MS ? row : null;
}

export async function undoRemove(token: string, path: string): Promise<boolean> {
  await requireSession();
  const row = readUndoToken(token);
  if (row === null) return false;
  const restored = await restoreLink(row);
  revalidateFrom(path);
  return restored;
}
