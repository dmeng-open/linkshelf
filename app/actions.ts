"use server";

import { revalidatePath } from "next/cache";
import { upsertLink } from "@/db/links";
import { parseLinkInput, readLinkFields, type LinkErrors, type LinkFields } from "@/lib/link";
import { requireSession } from "@/lib/session";

export type SaveState =
  | { status: "idle" }
  | { status: "saved"; outcome: "created" | "updated"; title: string }
  | { status: "invalid"; errors: LinkErrors; values: LinkFields };

export async function saveLink(_prev: SaveState, formData: FormData): Promise<SaveState> {
  await requireSession();
  const parsed = parseLinkInput(formData);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors, values: readLinkFields(formData) };

  const { outcome } = await upsertLink(parsed.value);
  revalidatePath("/");
  return { status: "saved", outcome, title: parsed.value.title };
}
