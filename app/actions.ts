"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setRead, upsertLink } from "@/db/links";
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
  const { pathname, search } = new URL(safeNext(formData.get("path")), "http://linkshelf.invalid");
  revalidatePath(pathname + search);
}
