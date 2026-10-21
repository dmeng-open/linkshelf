import { normalizeUrl, parseTags, type LinkInput, type Tag } from "./link";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_LINKS = 10_000;

const MAX_TITLE_LENGTH = 300;
const MAX_TAGS = 10;
const ANCHOR = /<a\s([^>]*)>([\s\S]*?)<\/a>/gi;
const ATTRIBUTE = /([a-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function attributes(raw: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const [, name, double, single] of raw.matchAll(ATTRIBUTE)) {
    found.set(name.toLowerCase(), decodeEntities(double ?? single ?? ""));
  }
  return found;
}

function cleanTitle(raw: string, fallback: string): string {
  const text = decodeEntities(raw.replace(/<[^>]*>/g, ""))
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [...(text || fallback)].slice(0, MAX_TITLE_LENGTH).join("");
}

function cleanTags(raw: string | undefined): Tag[] {
  const tags = new Set<Tag>();
  for (const name of (raw ?? "").split(",")) {
    const parsed = parseTags(name);
    if (parsed.ok && parsed.value[0] && tags.size < MAX_TAGS) tags.add(parsed.value[0]);
  }
  return [...tags];
}

export function parseBookmarksHtml(html: string): { links: LinkInput[]; invalid: number } {
  const links = new Map<string, LinkInput>();
  let invalid = 0;
  for (const [, rawAttributes, rawTitle] of html.matchAll(ANCHOR)) {
    const attrs = attributes(rawAttributes);
    const url = normalizeUrl(attrs.get("href") ?? "");
    if (url === null || url.length > 2048) {
      invalid++;
      continue;
    }
    if (!links.has(url)) links.set(url, { url, title: cleanTitle(rawTitle, url), tags: cleanTags(attrs.get("tags")) });
  }
  return { links: [...links.values()], invalid };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function bookmarksHeader(): string {
  return [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Linkshelf</H1>",
    "<DL><p>",
    "",
  ].join("\n");
}

export const bookmarksFooter = "</DL><p>\n";

export function bookmarkLine(link: { url: string; title: string; tags: string[]; createdAt: Date }): string {
  const added = Math.floor(link.createdAt.getTime() / 1000);
  const tags = link.tags.length > 0 ? ` TAGS="${escapeHtml(link.tags.join(","))}"` : "";
  return `    <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${added}"${tags}>${escapeHtml(link.title)}</A>\n`;
}

export function toBookmarksHtml(links: { url: string; title: string; tags: string[]; createdAt: Date }[]): string {
  return bookmarksHeader() + links.map(bookmarkLine).join("") + bookmarksFooter;
}
