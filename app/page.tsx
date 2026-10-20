import { listLinks } from "@/db/links";

export const dynamic = "force-dynamic";

export default async function Home() {
  const links = await listLinks();

  return (
    <main>
      <h1>Linkshelf</h1>
      {links.length === 0 ? (
        <p>No links yet</p>
      ) : (
        <ul>
          {links.map((link) => (
            <li key={link.id} data-testid="link-row">
              <a href={link.url}>{link.title}</a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
