import { describe, expect, it } from "vitest";
import { parseListQuery, type SearchParams } from "../lib/list-query";

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
