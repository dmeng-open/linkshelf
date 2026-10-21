import { describe, expect, it } from "vitest";
import { normalizeUrl, parseLinkInput, parseTags } from "../lib/link";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("normalizeUrl", () => {
  it.each([
    ["HTTPS://Example.com:443/a#x", "https://example.com/a"],
    ["https://a.com/p?q=1", "https://a.com/p?q=1"],
    ["  https://a.com/x  ", "https://a.com/x"],
    ["http://a.com:80/x", "http://a.com/x"],
    ["http://a.com:8080/x", "http://a.com:8080/x"],
    ["https://A.com/Path?Q=B", "https://a.com/Path?Q=B"],
    ["https://a.com/p?q=1#frag", "https://a.com/p?q=1"],
    ["https://a.com/#", "https://a.com/"],
    ["https://a.com", "https://a.com/"],
  ])("normalizes %j to %j", (raw, expected) => {
    expect(normalizeUrl(raw)).toBe(expected);
  });

  it.each(["ftp://a.com", "not a url", "", "   ", "javascript:alert(1)", "//a.com/x", "https://user:pw@example.com/"])(
    "rejects %j",
    (raw) => {
      expect(normalizeUrl(raw)).toBeNull();
    },
  );
});

describe("parseTags", () => {
  it.each([
    ["", []],
    ["   ", []],
    [" Rust, rust ,web dev", ["rust", "web-dev"]],
    ["a,,b, ,c", ["a", "b", "c"]],
    ["web   dev", ["web-dev"]],
    ["News,rust,NEWS", ["news", "rust"]],
    ["1,2,3,4,5,6,7,8,9,10", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]],
    ["a".repeat(32), ["a".repeat(32)]],
    ["rust-lang", ["rust-lang"]],
  ])("parses %j", (raw, expected) => {
    expect(parseTags(raw)).toEqual({ ok: true, value: expected });
  });

  it("does not count duplicate tags toward the limit of 10", () => {
    expect(parseTags("1,2,3,4,5,6,7,8,9,10,10,1").ok).toBe(true);
  });

  it.each([
    ["1,2,3,4,5,6,7,8,9,10,11", "at most 10"],
    ["a_b", '"a_b"'],
    ["ok, -lead", '"-lead"'],
    ["a".repeat(33), `"${"a".repeat(33)}"`],
    ["café", '"café"'],
    ["a.b", '"a.b"'],
    ["a,".repeat(500) + "a", "at most 1000"],
  ])("rejects %j", (raw, message) => {
    expect(parseTags(raw)).toEqual({ ok: false, error: expect.stringContaining(message) });
  });
});

describe("parseLinkInput", () => {
  it("returns the normalized url, trimmed title, and parsed tags", () => {
    expect(
      parseLinkInput(form({ url: "HTTPS://Example.com/a#top", title: "  First  ", tags: "News, rust" })),
    ).toEqual({ ok: true, value: { url: "https://example.com/a", title: "First", tags: ["news", "rust"] } });
  });

  it("allows an empty tags field", () => {
    expect(parseLinkInput(form({ url: "https://a.com", title: "A", tags: "" }))).toEqual({
      ok: true,
      value: { url: "https://a.com/", title: "A", tags: [] },
    });
  });

  it("treats missing fields as empty", () => {
    const result = parseLinkInput(new FormData());

    expect(result.ok).toBe(false);
    expect(result.ok ? {} : Object.keys(result.errors).sort()).toEqual(["title", "url"]);
  });

  it.each([
    ["an empty title", "", "Enter a title"],
    ["a whitespace-only title", "   ", "Enter a title"],
    ["a title over 300 characters", "x".repeat(301), "at most 300"],
    ["a title over 300 characters once trimmed", ` ${"x".repeat(301)} `, "at most 300"],
  ])("rejects %s", (_name, title, message) => {
    const result = parseLinkInput(form({ url: "https://a.com", title, tags: "" }));

    expect(result).toEqual({
      ok: false,
      errors: { title: expect.stringContaining(message) },
      values: { url: "https://a.com", title, tags: "" },
    });
  });

  it("rejects a title with a control character", () => {
    const result = parseLinkInput(form({ url: "https://a.com", title: "a\u0000b", tags: "" }));

    expect(result).toMatchObject({ ok: false, errors: { title: expect.stringContaining("control") } });
  });

  it("accepts a url of 2048 characters and rejects one of 2049", () => {
    const origin = "https://example.com/";
    const accepted = parseLinkInput(form({ url: origin + "a".repeat(2048 - origin.length), title: "A", tags: "" }));
    const rejected = parseLinkInput(form({ url: origin + "a".repeat(2049 - origin.length), title: "A", tags: "" }));

    expect(accepted.ok).toBe(true);
    expect(rejected).toMatchObject({ ok: false, errors: { url: expect.stringContaining("at most 2048") } });
  });

  it("echoes the submitted fields on failure", () => {
    const result = parseLinkInput(form({ url: "nope", title: " T ", tags: "a_b" }));

    expect(result).toMatchObject({ ok: false, values: { url: "nope", title: " T ", tags: "a_b" } });
  });

  it.each([
    ["300 characters", "x".repeat(300)],
    ["300 characters with padding", ` ${"x".repeat(300)} `],
    ["300 emoji", "😀".repeat(300)],
  ])("accepts a title of %s", (_name, title) => {
    expect(parseLinkInput(form({ url: "https://a.com", title, tags: "" })).ok).toBe(true);
  });

  it("reports one message per invalid field", () => {
    const result = parseLinkInput(form({ url: "ftp://x", title: "", tags: "a_b" }));

    expect(result).toMatchObject({
      ok: false,
      errors: {
        url: expect.any(String),
        title: expect.any(String),
        tags: expect.stringContaining('"a_b"'),
      },
    });
  });
});
