type Brand<T, B extends string> = T & { readonly __brand: B };

export type NormalizedUrl = Brand<string, "NormalizedUrl">;
export type Tag = Brand<string, "Tag">;
export type LinkId = Brand<string, "LinkId">;
export type LinkInput = { url: NormalizedUrl; title: string; tags: Tag[] };
export type LinkField = "url" | "title" | "tags";
export type LinkErrors = Partial<Record<LinkField, string>>;
export type LinkFields = Record<LinkField, string>;

const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const MAX_TAGS = 10;
const MAX_TITLE_LENGTH = 300;
const MAX_URL_LENGTH = 2048;
const MAX_TAGS_INPUT_LENGTH = 1000;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function isTag(value: string): value is Tag {
  return TAG_PATTERN.test(value);
}

export function normalizeUrl(raw: string): NormalizedUrl | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username !== "" || url.password !== "") return null;
  url.hash = "";
  return url.href as NormalizedUrl;
}

export function parseTags(raw: string): { ok: true; value: Tag[] } | { ok: false; error: string } {
  if (raw.length > MAX_TAGS_INPUT_LENGTH) {
    return { ok: false, error: `Use at most ${MAX_TAGS_INPUT_LENGTH} characters of tags` };
  }
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

function readLinkFields(formData: FormData): LinkFields {
  const text = (name: LinkField) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return { url: text("url"), title: text("title"), tags: text("tags") };
}

export function parseLinkInput(
  formData: FormData,
): { ok: true; value: LinkInput } | { ok: false; errors: LinkErrors; values: LinkFields } {
  const values = readLinkFields(formData);
  const url = normalizeUrl(values.url);
  const title = values.title.trim();
  const tags = parseTags(values.tags);
  const titleLength = [...title].length;

  const errors: LinkErrors = {};
  if (url === null) errors.url = "Enter a valid http or https URL";
  else if (url.length > MAX_URL_LENGTH) errors.url = `Use a URL of at most ${MAX_URL_LENGTH} characters`;
  if (titleLength === 0) errors.title = "Enter a title";
  else if (titleLength > MAX_TITLE_LENGTH) errors.title = `Use a title of at most ${MAX_TITLE_LENGTH} characters`;
  else if (CONTROL_CHARACTERS.test(title)) errors.title = "Remove control characters from the title";
  if (!tags.ok) errors.tags = tags.error;

  if (url === null || errors.url !== undefined || errors.title !== undefined || !tags.ok) {
    return { ok: false, errors, values };
  }
  return { ok: true, value: { url, title, tags: tags.value } };
}
