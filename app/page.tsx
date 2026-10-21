import Link from "next/link";
import { listLinks } from "@/db/links";
import { parseListQuery, type SearchParams } from "@/lib/list-query";
import { LinkRow } from "./link-row";
import { Pager } from "./pager";
import { SaveForm } from "./save-form";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = parseListQuery(await searchParams);
  const { tag } = query;
  const { links, total } = await listLinks(query);

  return (
    <main>
      <h1>Linkshelf</h1>
      <SaveForm />
      {tag !== null && (
        <p>
          Tagged #{tag} <Link href="/">Clear filter</Link>
        </p>
      )}
      {total === 0 ? (
        <p>{tag === null ? "No links yet" : `No links tagged #${tag}`}</p>
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
