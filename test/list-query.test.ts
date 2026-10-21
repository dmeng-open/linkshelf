import { describe, expect, it } from "vitest";
import { listHref, parseListQuery, type SearchParams } from "../lib/list-query";
import type { Tag } from "../lib/link";

describe("parseListQuery", () => {
  it.each<[string, SearchParams, string | null]>([
    ["?tag=Rust", { tag: "Rust" }, "rust"],
    ["?tag=", { tag: "" }, null],
    ["?tag=a_b", { tag: "a_b" }, null],
    ["?tag=a&tag=b", { tag: ["a", "b"] }, "a"],
    ["no tag", {}, null],
    ["?tag=a,b", { tag: "a,b" }, null],
  ])("%s gives %s", (_, searchParams, tag) => {
    expect(parseListQuery(searchParams).tag).toBe(tag);
  });
});

describe("parseListQuery page", () => {
  it.each<[string, SearchParams, number]>([
    ["?page=0", { page: "0" }, 1],
    ["?page=-1", { page: "-1" }, 1],
    ["?page=abc", { page: "abc" }, 1],
    ["?page=2.5", { page: "2.5" }, 1],
    ["?page=3", { page: "3" }, 3],
    ["no page", {}, 1],
    ["?page=99999999999999999999", { page: "99999999999999999999" }, 1],
  ])("%s gives %s", (_, searchParams, page) => {
    expect(parseListQuery(searchParams).page).toBe(page);
  });
});

describe("parseListQuery state", () => {
  it.each<[string, SearchParams, string]>([
    ["?state=unread", { state: "unread" }, "unread"],
    ["?state=", { state: "" }, "all"],
    ["?state=READ", { state: "READ" }, "all"],
    ["no state", {}, "all"],
  ])("%s gives %s", (_, searchParams, state) => {
    expect(parseListQuery(searchParams).state).toBe(state);
  });
});

describe("listHref", () => {
  it.each<[Parameters<typeof listHref>[0], string]>([
    [{ tag: "rust" as Tag, state: "unread", page: 2 }, "/?tag=rust&state=unread&page=2"],
    [{ tag: null, state: "unread", page: null }, "/?state=unread"],
    [{ tag: "rust" as Tag, state: "all", page: null }, "/?tag=rust"],
    [{ tag: null, state: "all", page: null }, "/"],
  ])("builds %j as %s", (query, href) => {
    expect(listHref(query)).toBe(href);
  });
});

describe("parseListQuery q", () => {
  it.each<[string, SearchParams, string | null]>([
    ["surrounding and inner whitespace", { q: "  Rust   Book " }, "Rust Book"],
    ["an empty value", { q: "" }, null],
    ["only spaces", { q: "   " }, null],
    ["a 300-character value", { q: "a".repeat(300) }, "a".repeat(100)],
    ["no q", {}, null],
  ])("handles %s", (_, searchParams, q) => {
    expect(parseListQuery(searchParams).q).toBe(q);
  });

  it("listHref keeps q", () => {
    expect(listHref({ tag: "rust" as Tag, state: "unread", q: "rust book", page: 2 })).toBe(
      "/?q=rust+book&tag=rust&state=unread&page=2",
    );
  });
});
