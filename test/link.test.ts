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

  it.each(["ftp://a.com", "not a url", "", "   ", "javascript:alert(1)", "//a.com/x"])(
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

  it("counts the 11th distinct tag but not duplicates", () => {
    expect(parseTags("1,2,3,4,5,6,7,8,9,10,10,1").ok).toBe(true);
  });

  it.each([
    ["1,2,3,4,5,6,7,8,9,10,11", "at most 10"],
    ["a_b", '"a_b"'],
    ["ok, -lead", '"-lead"'],
    ["a".repeat(33), `"${"a".repeat(33)}"`],
    ["café", '"café"'],
    ["a.b", '"a.b"'],
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

    expect(result).toEqual({ ok: false, errors: { title: expect.stringContaining(message) } });
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

    expect(result).toEqual({
      ok: false,
      errors: {
        url: expect.any(String),
        title: expect.any(String),
        tags: expect.stringContaining('"a_b"'),
      },
    });
  });
});
