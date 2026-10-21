import { parseTags, type Tag } from "./link";

export const PAGE_SIZE = 20;

export type SearchParams = Record<string, string | string[] | undefined>;
export type ListState = "all" | "unread";
export type ListQuery = { tag: Tag | null; page: number; state: ListState };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function parseTag(raw: string | undefined): Tag | null {
  if (raw === undefined) return null;
  const parsed = parseTags(raw.toLowerCase());
  return parsed.ok && parsed.value.length === 1 ? parsed.value[0] : null;
}

function parsePage(raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function parseListQuery(searchParams: SearchParams): ListQuery {
  return {
    tag: parseTag(first(searchParams.tag)),
    page: parsePage(first(searchParams.page)),
    state: first(searchParams.state) === "unread" ? "unread" : "all",
  };
}

export function listHref({ tag, page, state }: { tag: Tag | null; page: number | null; state: ListState }): string {
  const params = new URLSearchParams();
  if (tag !== null) params.set("tag", tag);
  if (state === "unread") params.set("state", state);
  if (page !== null) params.set("page", String(page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
