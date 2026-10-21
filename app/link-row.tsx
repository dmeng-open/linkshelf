"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useOptimistic } from "react";
import type { Link } from "@/db/schema";
import { setLinkRead } from "./actions";

export function LinkRow({ link }: { link: Link }) {
  const read = link.readAt !== null;
  const [shownRead, setShownRead] = useOptimistic(read);
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const pending = shownRead !== read;

  async function toggle(formData: FormData) {
    setShownRead(!shownRead);
    await setLinkRead(formData);
  }

  return (
    <li data-testid="link-row" data-read={shownRead} style={shownRead ? { color: "#888" } : undefined}>
      <a href={link.url} style={shownRead ? { color: "inherit" } : undefined}>
        {link.title}
      </a>{" "}
      <span>{new URL(link.url).host}</span>
      {link.tags.length > 0 && (
        <ul>
          {link.tags.map((tag) => (
            <li key={tag} data-testid="tag">
              {tag}
            </li>
          ))}
        </ul>
      )}{" "}
      <time dateTime={link.createdAt.toISOString()}>{link.createdAt.toISOString().slice(0, 10)}</time>{" "}
      {shownRead && <span>Read</span>}{" "}
      <form action={toggle} style={{ display: "inline" }}>
        <input type="hidden" name="id" value={link.id} />
        <input type="hidden" name="read" value={String(!shownRead)} />
        <input type="hidden" name="path" value={search ? `${pathname}?${search}` : pathname} />
        <button type="submit" disabled={pending}>
          {shownRead ? "Mark unread" : "Mark read"}
        </button>
      </form>
    </li>
  );
}
