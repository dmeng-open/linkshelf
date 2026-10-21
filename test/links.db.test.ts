import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../db/client";
import { listLinks, upsertLink } from "../db/links";
import { links } from "../db/schema";
import { parseLinkInput, type LinkInput } from "../lib/link";
import "./db";

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

describe("upsertLink", () => {
  function input(title: string, tags = "", url = "https://example.com/a"): LinkInput {
    const data = new FormData();
    data.set("url", url);
    data.set("title", title);
    data.set("tags", tags);
    const parsed = parseLinkInput(data);
    if (!parsed.ok) throw new Error(`invalid test input: ${JSON.stringify(parsed.errors)}`);
    return parsed.value;
  }

  it("leaves one row when one url is saved twice and reports the second as updated", async () => {
    const first = await upsertLink(input("First", "news"));
    const second = await upsertLink(input("Renamed", "web, rust"));

    expect(first.outcome).toBe("created");
    expect(second).toEqual({ id: first.id, outcome: "updated" });
    const rows = await db.select().from(links);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ url: "https://example.com/a", title: "Renamed", tags: ["web", "rust"] });
  });

  it("keeps read_at set before an update", async () => {
    const { id } = await upsertLink(input("First"));
    const readAt = at(5);
    await db.update(links).set({ readAt }).where(eq(links.id, id));

    await upsertLink(input("Renamed"));

    const [row] = await db.select().from(links);
    expect(row.readAt).toEqual(readAt);
    expect(row.title).toBe("Renamed");
  });

  it("keeps created_at on an update and moves updated_at", async () => {
    await db.insert(links).values({
      url: "https://example.com/a",
      title: "Old",
      createdAt: at(1),
      updatedAt: at(1),
    });

    await upsertLink(input("Renamed"));

    const [row] = await db.select().from(links);
    expect(row.createdAt).toEqual(at(1));
    expect(row.updatedAt.getTime()).toBeGreaterThan(at(1).getTime());
  });

  it("saves a url of 2048 characters", async () => {
    const origin = "https://example.com/";
    const url = origin + "a".repeat(2048 - origin.length);

    await upsertLink(input("Long", "", url));

    const [row] = await db.select().from(links);
    expect(row.url).toBe(url);
  });
});
