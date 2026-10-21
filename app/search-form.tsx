import type { ListQuery } from "@/lib/list-query";

export function SearchForm({ tag, state, q }: Pick<ListQuery, "tag" | "state" | "q">) {
  return (
    <form action="/" role="search">
      <label htmlFor="q">Search</label> <input id="q" name="q" type="search" defaultValue={q ?? ""} maxLength={100} />
      {tag !== null && <input type="hidden" name="tag" value={tag} />}
      {state === "unread" && <input type="hidden" name="state" value={state} />}{" "}
      <button type="submit">Search</button>
    </form>
  );
}
