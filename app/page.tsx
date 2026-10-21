import Link from "next/link";
import { countUnread, listLinks } from "@/db/links";
import { listHref, parseListQuery, type SearchParams } from "@/lib/list-query";
import { LinkRow } from "./link-row";
import { Pager } from "./pager";
import { SaveForm } from "./save-form";

export const dynamic = "force-dynamic";

function emptyMessage({ tag, state }: { tag: string | null; state: "all" | "unread" }): string {
  if (state === "unread") return "Nothing left to read";
  return tag === null ? "No links yet" : `No links tagged #${tag}`;
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = parseListQuery(await searchParams);
  const { tag, state } = query;
  const [{ links, total }, unread] = await Promise.all([listLinks(query), countUnread({ tag })]);

  return (
    <main>
      <h1>Linkshelf</h1>
      <SaveForm />
      <nav aria-label="Read state">
        {unread} unread{" "}
        {state === "unread" ? (
          <Link href={listHref({ tag, state: "all", page: null })}>All</Link>
        ) : (
          <Link href={listHref({ tag, state: "unread", page: null })}>Unread only</Link>
        )}
      </nav>
      {tag !== null && (
        <p>
          Tagged #{tag} <Link href={listHref({ tag: null, state, page: null })}>Clear filter</Link>
        </p>
      )}
      {total === 0 ? (
        <p>{emptyMessage(query)}</p>
      ) : (
        links.length > 0 && (
          <ul>
            {links.map((link) => (
              <LinkRow key={link.id} link={link} />
            ))}
          </ul>
        )
      )}
      <Pager {...query} total={total} />
    </main>
  );
}
