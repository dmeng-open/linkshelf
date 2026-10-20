import { describe, expect, it } from "vitest";
import { db } from "../db/client";
import { listLinks } from "../db/links";
import { links } from "../db/schema";

const at = (minutes: number) => new Date(Date.UTC(2025, 0, 1, 0, minutes));

describe("listLinks", () => {
  it("returns an empty list for an empty table", async () => {
    expect(await listLinks()).toEqual([]);
  });

  it("returns the newest 20 of 25 links, newest first", async () => {
    await db.insert(links).values(
      Array.from({ length: 25 }, (_, i) => ({
        url: `https://example.com/${i + 1}`,
        title: `Link ${i + 1}`,
        createdAt: at(i + 1),
      })),
    );

    const rows = await listLinks();

    expect(rows.map((row) => row.title)).toEqual(
      Array.from({ length: 20 }, (_, i) => `Link ${25 - i}`),
    );
  });

  it("orders links with the same created_at by id descending", async () => {
    await db.insert(links).values([
      { id: "00000000-0000-4000-8000-000000000001", url: "https://example.com/a", title: "A", createdAt: at(1) },
      { id: "00000000-0000-4000-8000-000000000003", url: "https://example.com/c", title: "C", createdAt: at(1) },
      { id: "00000000-0000-4000-8000-000000000002", url: "https://example.com/b", title: "B", createdAt: at(1) },
    ]);

    expect((await listLinks()).map((row) => row.title)).toEqual(["C", "B", "A"]);
  });
});
