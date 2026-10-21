import { listLinks } from "@/db/links";
import { LinkRow } from "./link-row";
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
            <LinkRow key={link.id} link={link} />
          ))}
        </ul>
      )}
    </main>
  );
}
