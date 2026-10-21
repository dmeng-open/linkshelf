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
    expect(parseListQuery(searchParams)).toEqual({ tag });
  });
});
