import Link from "next/link";
import { countUnread, listLinks } from "@/db/links";
import { listHref, parseListQuery, type SearchParams } from "@/lib/list-query";
import { LinkRow } from "./link-row";
import { Pager } from "./pager";
import { SaveForm } from "./save-form";
import { SearchForm } from "./search-form";

export const dynamic = "force-dynamic";

function emptyMessage({ tag, state, q }: { tag: string | null; state: "all" | "unread"; q: string | null }): string {
  if (q !== null) return `No links match "${q}"`;
  if (state === "unread") return "Nothing left to read";
  return tag === null ? "No links yet" : `No links tagged #${tag}`;
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = parseListQuery(await searchParams);
  const { tag, state, q } = query;
  const [{ links, total }, unread] = await Promise.all([listLinks(query), countUnread({ tag })]);

  return (
    <main>
      <h1>Linkshelf</h1>
      <SaveForm />
      <SearchForm tag={tag} state={state} q={q} />
      <nav aria-label="Read state">
        {unread} unread{" "}
        {state === "unread" ? (
          <Link href={listHref({ tag, state: "all", q, page: null })}>All</Link>
        ) : (
          <Link href={listHref({ tag, state: "unread", q, page: null })}>Unread only</Link>
        )}
      </nav>
      {tag !== null && (
        <p>
          Tagged #{tag} <Link href={listHref({ tag: null, state, q, page: null })}>Clear filter</Link>
        </p>
      )}
      {q !== null && (
        <p>
          Results for &ldquo;{q}&rdquo; <Link href={listHref({ tag, state, page: null })}>Clear search</Link>
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
