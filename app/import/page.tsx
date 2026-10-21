import Link from "next/link";
import { MAX_IMPORT_LINKS } from "@/lib/bookmarks";
import { importBookmarks } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ERRORS: Record<string, string> = {
  missing: "Choose a bookmarks file to import.",
  "too-large": "That file is larger than 5 MB. Export fewer bookmarks and try again.",
  "too-many": `That file holds more than ${MAX_IMPORT_LINKS.toLocaleString("en-US")} links. Split it and try again.`,
};

const count = (value: unknown) => (typeof value === "string" && /^\d{1,6}$/.test(value) ? Number(value) : null);

export default async function ImportPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  const imported = count(params.imported);
  const skipped = count(params.skipped);
  const invalid = count(params.invalid);

  return (
    <main>
      <h1>Import bookmarks</h1>
      <p>Export your bookmarks from Chrome, Firefox, or Safari as an HTML file, then choose it here. Links you already saved stay as they are.</p>
      <form action={importBookmarks}>
        <label htmlFor="file">Bookmarks file</label> <input id="file" name="file" type="file" accept=".html,.htm,text/html" required />{" "}
        <button type="submit">Import</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {imported !== null && skipped !== null && invalid !== null && (
        <p role="status">
          Imported {imported}, skipped {skipped} already saved, {invalid} invalid
        </p>
      )}
      <p>
        <Link href="/">Back to your shelf</Link>
      </p>
    </main>
  );
}
