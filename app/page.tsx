import { listLinks } from "@/db/links";
import { SaveForm } from "./save-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const links = await listLinks();

  return (
    <main>
      <h1>Linkshelf</h1>
      <SaveForm />
      {links.length === 0 ? (
        <p>No links yet</p>
      ) : (
        <ul>
          {links.map((link) => (
            <li key={link.id} data-testid="link-row">
              <a href={link.url}>{link.title}</a> <span>{new URL(link.url).host}</span>
              {link.tags.length > 0 && (
                <ul>
                  {link.tags.map((tag) => (
                    <li key={tag} data-testid="tag">
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
              <time dateTime={link.createdAt.toISOString()}>{link.createdAt.toISOString().slice(0, 10)}</time>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
