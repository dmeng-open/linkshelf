"use client";

import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useOptimistic, useState, useTransition } from "react";
import type { Link } from "@/db/schema";
import type { Tag } from "@/lib/link";
import { listHref } from "@/lib/list-query";
import { removeLink, setLinkRead, undoRemove } from "./actions";
import { EditLink } from "./edit-link";

export function LinkRow({ link }: { link: Link }) {
  const read = link.readAt !== null;
  const [shownRead, setShownRead] = useOptimistic(read);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const state = searchParams.get("state") === "unread" ? "unread" : "all";
  const pending = shownRead !== read;
  const path = search ? `${pathname}?${search}` : pathname;
  const [mode, setMode] = useState<"view" | "edit" | "deleted" | "already-gone" | "not-restored">("view");
  const [busy, startTransition] = useTransition();
  const [undoToken, setUndoToken] = useState<string | null>(null);
  const closeEditor = useCallback(() => setMode("view"), []);

  async function toggle(formData: FormData) {
    setShownRead(!shownRead);
    await setLinkRead(formData);
  }

  function remove() {
    startTransition(async () => {
      const token = await removeLink(link.id);
      setUndoToken(token);
      setMode(token ? "deleted" : "already-gone");
    });
  }

  function undo() {
    startTransition(async () => {
      setMode(undoToken !== null && (await undoRemove(undoToken, path)) ? "view" : "not-restored");
    });
  }

  if (mode === "deleted" || mode === "already-gone" || mode === "not-restored") {
    return (
      <li data-testid="deleted-row" role="status">
        {mode === "deleted" ? (
          <>
            Deleted {link.title}.{" "}
            <button type="button" onClick={undo} disabled={busy}>
              Undo
            </button>
          </>
        ) : mode === "already-gone" ? (
          `${link.title} was already deleted.`
        ) : (
          `${link.title} could not be restored.`
        )}
      </li>
    );
  }

  if (mode === "edit") {
    return (
      <li data-testid="link-row">
        <EditLink link={link} path={path} onDone={closeEditor} />
      </li>
    );
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
              <NextLink href={listHref({ tag: tag as Tag, state, page: null })}>{tag}</NextLink>
            </li>
          ))}
        </ul>
      )}{" "}
      <time dateTime={link.createdAt.toISOString()}>{link.createdAt.toISOString().slice(0, 10)}</time>{" "}
      {shownRead && <span>Read</span>}{" "}
      <form action={toggle} style={{ display: "inline" }}>
        <input type="hidden" name="id" value={link.id} />
        <input type="hidden" name="read" value={String(!shownRead)} />
        <input type="hidden" name="path" value={path} />
        <button type="submit" disabled={pending}>
          {shownRead ? "Mark unread" : "Mark read"}
        </button>
      </form>{" "}
      <button type="button" onClick={() => setMode("edit")}>
        Edit
      </button>{" "}
      <button type="button" onClick={remove} disabled={busy}>
        Delete
      </button>
    </li>
  );
}
