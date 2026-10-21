"use client";

import { useActionState, useEffect } from "react";
import type { Link } from "@/db/schema";
import { editLink, type EditState } from "./actions";

const idle: EditState = { status: "idle" };

export function EditLink({ link, path, onDone }: { link: Link; path: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(editLink, idle);
  const invalid = state.status === "invalid" ? state : null;

  useEffect(() => {
    if (state.status === "saved") onDone();
  }, [state, onDone]);

  const field = (name: "title" | "tags", label: string, value: string) => {
    const id = `edit-${name}-${link.id}`;
    const error = invalid?.errors[name];
    return (
      <span>
        <label htmlFor={id}>{label}</label>{" "}
        <input
          id={id}
          name={name}
          defaultValue={invalid?.values[name] ?? value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && <span id={`${id}-error`}> {error}</span>}{" "}
      </span>
    );
  };

  return (
    <form action={action} aria-label={`Edit ${link.title}`}>
      <input type="hidden" name="id" value={link.id} />
      <input type="hidden" name="url" value={link.url} />
      <input type="hidden" name="path" value={path} />
      {field("title", "Edit title", link.title)}
      {field("tags", "Edit tags", link.tags.join(", "))}
      <button type="submit" disabled={pending}>
        Save
      </button>{" "}
      <button type="button" onClick={onDone}>
        Cancel
      </button>
      {state.status === "missing" && <span role="status"> This link no longer exists</span>}
    </form>
  );
}
