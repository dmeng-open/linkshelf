"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteLink, restoreLink, setRead, updateLink, upsertLink } from "@/db/links";
import { parseLinkInput, type LinkErrors, type LinkFields, type LinkId } from "@/lib/link";
import { requireSession, safeNext } from "@/lib/session";
import type { Link } from "@/db/schema";

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

export async function removeLink(id: string): Promise<Link | null> {
  await requireSession();
  const parsed = linkId.safeParse(id);
  return parsed.success ? deleteLink(parsed.data) : null;
}

const deletedLink = z.object({
  id: z.uuid(),
  url: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  readAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export async function undoRemove(snapshot: unknown, path: string): Promise<boolean> {
  await requireSession();
  const row = deletedLink.safeParse(snapshot);
  if (!row.success) return false;
  const fields = new FormData();
  fields.set("url", row.data.url);
  fields.set("title", row.data.title);
  fields.set("tags", row.data.tags.join(","));
  const parsed = parseLinkInput(fields);
  if (!parsed.ok) return false;

  const restored = await restoreLink({ ...row.data, ...parsed.value, id: row.data.id as LinkId });
  revalidateFrom(path);
  return restored;
}
