"use client";

import { useActionState } from "react";
import type { LinkField } from "@/lib/link";
import { saveLink, type SaveState } from "./actions";

const FIELDS: { name: LinkField; label: string }[] = [
  { name: "url", label: "URL" },
  { name: "title", label: "Title" },
  { name: "tags", label: "Tags" },
];

const idle: SaveState = { status: "idle" };

export function SaveForm() {
  const [state, action, pending] = useActionState(saveLink, idle);
  const invalid = state.status === "invalid" ? state : null;

  return (
    <form
      key={invalid ? JSON.stringify(invalid.values) : state.status}
      action={action}
      noValidate
    >
      {FIELDS.map(({ name, label }) => {
        const error = invalid?.errors[name];
        return (
          <div key={name}>
            <label htmlFor={name}>{label}</label>
            <input
              id={name}
              name={name}
              type="text"
              defaultValue={invalid?.values[name] ?? ""}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${name}-error` : undefined}
            />
            {error && <p id={`${name}-error`}>{error}</p>}
          </div>
        );
      })}
      <button type="submit" disabled={pending}>
        Save
      </button>
      <p role="status">
        {state.status === "saved" && `${state.outcome === "created" ? "Saved" : "Updated"} ${state.title}`}
      </p>
    </form>
  );
}
