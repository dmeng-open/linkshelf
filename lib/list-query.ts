import { parseTags, type Tag } from "./link";

export type SearchParams = Record<string, string | string[] | undefined>;
export type ListQuery = { tag: Tag | null };

export function parseListQuery(searchParams: SearchParams): ListQuery {
  const raw = searchParams.tag;
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (first === undefined) return { tag: null };
  const parsed = parseTags(first.toLowerCase());
  return { tag: parsed.ok && parsed.value.length === 1 ? parsed.value[0] : null };
}
