type Brand<T, B extends string> = T & { readonly __brand: B };

export type NormalizedUrl = Brand<string, "NormalizedUrl">;
export type Tag = Brand<string, "Tag">;
export type LinkId = Brand<string, "LinkId">;
export type LinkInput = { url: NormalizedUrl; title: string; tags: Tag[] };
export type LinkField = "url" | "title" | "tags";
export type LinkErrors = Partial<Record<LinkField, string>>;
export type LinkFields = Record<LinkField, string>;

const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_TAGS = 10;
const MAX_TITLE_LENGTH = 300;

function canonicalHref(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hash = "";
  return url.href;
}

function isNormalizedUrl(value: string): value is NormalizedUrl {
  return canonicalHref(value) === value;
}

function isTag(value: string): value is Tag {
  return TAG_PATTERN.test(value);
}

export function isLinkId(value: string): value is LinkId {
  return UUID_PATTERN.test(value);
}

export function normalizeUrl(raw: string): NormalizedUrl | null {
  const href = canonicalHref(raw);
  return href !== null && isNormalizedUrl(href) ? href : null;
}

export function parseTags(raw: string): { ok: true; value: Tag[] } | { ok: false; error: string } {
  const names = [
    ...new Set(
      raw
        .split(",")
        .map((name) => name.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter((name) => name !== ""),
    ),
  ];
  if (names.length > MAX_TAGS) return { ok: false, error: `Use at most ${MAX_TAGS} tags` };

  const tags: Tag[] = [];
  for (const name of names) {
    if (!isTag(name)) {
      return {
        ok: false,
        error: `Tag "${name}" must be 1 to 32 characters: lowercase letters, digits, and hyphens, starting with a letter or digit`,
      };
    }
    tags.push(name);
  }
  return { ok: true, value: tags };
}

export function readLinkFields(formData: FormData): LinkFields {
  const text = (name: LinkField) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return { url: text("url"), title: text("title"), tags: text("tags") };
}

export function parseLinkInput(
  formData: FormData,
): { ok: true; value: LinkInput } | { ok: false; errors: LinkErrors } {
  const fields = readLinkFields(formData);
  const url = normalizeUrl(fields.url);
  const title = fields.title.trim();
  const tags = parseTags(fields.tags);
  const titleLength = [...title].length;

  const errors: LinkErrors = {};
  if (url === null) errors.url = "Enter a valid http or https URL";
  if (titleLength === 0) errors.title = "Enter a title";
  else if (titleLength > MAX_TITLE_LENGTH) errors.title = `Use a title of at most ${MAX_TITLE_LENGTH} characters`;
  if (!tags.ok) errors.tags = tags.error;

  if (url === null || errors.title !== undefined || !tags.ok) return { ok: false, errors };
  return { ok: true, value: { url, title, tags: tags.value } };
}
