"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { importLinks } from "@/db/links";
import { MAX_IMPORT_BYTES, MAX_IMPORT_LINKS, parseBookmarksHtml } from "@/lib/bookmarks";
import { requireSession } from "@/lib/session";

export async function importBookmarks(formData: FormData) {
  await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/import?error=missing");
  if (file.size > MAX_IMPORT_BYTES) redirect("/import?error=too-large");

  const { links, invalid } = parseBookmarksHtml(await file.text());
  if (links.length > MAX_IMPORT_LINKS) redirect("/import?error=too-many");

  const { imported, skipped } = await importLinks(links);
  revalidatePath("/");
  redirect(`/import?${new URLSearchParams({ imported: String(imported), skipped: String(skipped), invalid: String(invalid) })}`);
}
