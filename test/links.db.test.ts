import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/client";
import { countUnread, deleteLink, listLinks as listPage, restoreLink, setRead, updateLink, upsertLink } from "../db/links";
import { links } from "../db/schema";
import { parseLinkInput, type LinkId, type LinkInput, type Tag } from "../lib/link";
import type { ListQuery } from "../lib/list-query";
import "./db";

const at = (minutes: number) => new Date(Date.UTC(2025, 0, 1, 0, minutes));

const listLinks = async ({ tag }: { tag: Tag | null }) => (await listPage({ tag, page: 1, state: "all" })).links;

describe("listLinks", () => {
  it("returns an empty list for an empty table", async () => {
    expect(await listLinks({ tag: null })).toEqual([]);
  });

  it("returns the newest 20 of 25 links, newest first", async () => {
    await db.insert(links).values(
      Array.from({ length: 25 }, (_, i) => ({
        url: `https://example.com/${i + 1}`,
        title: `Link ${i + 1}`,
        createdAt: at(i + 1),
      })),
    );

    const rows = await listLinks({ tag: null });

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

    expect((await listLinks({ tag: null })).map((row) => row.title)).toEqual(["C", "B", "A"]);
  });

  it("returns only rows tagged rust, newest first", async () => {
    await db.insert(links).values([
      { url: "https://example.com/1", title: "Old rust", tags: ["rust", "web"], createdAt: at(1) },
      { url: "https://example.com/2", title: "Plain", tags: ["web"], createdAt: at(2) },
      { url: "https://example.com/3", title: "New rust", tags: ["rust"], createdAt: at(3) },
      { url: "https://example.com/4", title: "Untagged", createdAt: at(4) },
    ]);

    const rows = await listLinks({ tag: "rust" as Tag });

    expect(rows.map((row) => row.title)).toEqual(["New rust", "Old rust"]);
  });

  it("returns no rows for an unknown tag", async () => {
    await db.insert(links).values({ url: "https://example.com/1", title: "Rust", tags: ["rust"] });

    expect(await listLinks({ tag: "nothing-here" as Tag })).toEqual([]);
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

describe("setRead", () => {
  async function seed(): Promise<LinkId> {
    const [row] = await db
      .insert(links)
      .values({ url: "https://example.com/a", title: "First", tags: ["news", "rust"], createdAt: at(1) })
      .returning({ id: links.id });
    return row.id as LinkId;
  }

  const readAt = async (id: LinkId) =>
    (await db.select({ readAt: links.readAt }).from(links).where(eq(links.id, id)))[0].readAt;

  it("keeps the first read_at when a link is marked read twice", async () => {
    const id = await seed();

    expect(await setRead(id, true)).toBe(true);
    const first = await readAt(id);
    expect(first).toBeInstanceOf(Date);
    expect(await setRead(id, true)).toBe(true);

    expect(await readAt(id)).toEqual(first);
  });

  it("clears read_at when a link is marked unread", async () => {
    const id = await seed();
    await setRead(id, true);

    expect(await setRead(id, false)).toBe(true);

    expect(await readAt(id)).toBeNull();
  });

  it("returns false for an unknown id", async () => {
    await seed();

    expect(await setRead("00000000-0000-4000-8000-0000000000ff" as LinkId, true)).toBe(false);
  });

  it("leaves title, tags, and created_at unchanged", async () => {
    const id = await seed();

    await setRead(id, true);
    await setRead(id, false);

    const [row] = await db.select().from(links);
    expect(row).toMatchObject({ title: "First", tags: ["news", "rust"], createdAt: at(1) });
  });
});

describe("listLinks paging", () => {
  async function seed45(taggedFrom = 46) {
    await db.insert(links).values(
      Array.from({ length: 45 }, (_, i) => ({
        url: `https://example.com/${i + 1}`,
        title: `Link ${i + 1}`,
        tags: i + 1 >= taggedFrom ? ["rust"] : [],
        createdAt: at(i + 1),
      })),
    );
  }
  const page = (n: number, tag: Tag | null = null, state: ListQuery["state"] = "all"): ListQuery => ({ tag, page: n, state });

  it("returns 20, 20, and 5 rows on pages 1, 2, and 3", async () => {
    await seed45();

    const sizes = await Promise.all([1, 2, 3].map(async (n) => (await listPage(page(n))).links.length));

    expect(sizes).toEqual([20, 20, 5]);
  });

  it("splits all 45 rows across three pages with no id repeated", async () => {
    await seed45();

    const ids = (await Promise.all([1, 2, 3].map((n) => listPage(page(n))))).flatMap((p) => p.links.map((l) => l.id));
    const all = (await db.select({ id: links.id }).from(links)).map((row) => row.id);

    expect(new Set(ids).size).toBe(45);
    expect(new Set(ids)).toEqual(new Set(all));
  });

  it("counts 45 unfiltered and only tagged rows under a tag", async () => {
    await seed45(21);

    expect((await listPage(page(1))).total).toBe(45);
    const tagged = await listPage(page(2, "rust" as Tag));
    expect(tagged.total).toBe(25);
    expect(tagged.links.map((row) => row.title)).toEqual(["Link 25", "Link 24", "Link 23", "Link 22", "Link 21"]);
  });
});

describe("updateLink, deleteLink, and restoreLink", () => {
  async function seedRead(): Promise<LinkId> {
    const [row] = await db
      .insert(links)
      .values({
        url: "https://example.com/a",
        title: "First",
        tags: ["news"],
        readAt: at(5),
        createdAt: at(1),
        updatedAt: at(1),
      })
      .returning({ id: links.id });
    return row.id as LinkId;
  }

  it("updateLink changes title and tags and keeps url, read_at, and created_at", async () => {
    const id = await seedRead();

    expect(await updateLink(id, { title: "Edited", tags: ["a", "b"] as Tag[] })).toBe(true);

    const [row] = await db.select().from(links);
    expect(row).toMatchObject({
      url: "https://example.com/a",
      title: "Edited",
      tags: ["a", "b"],
      readAt: at(5),
      createdAt: at(1),
    });
  });

  it("updateLink returns false for an unknown id", async () => {
    await seedRead();

    expect(await updateLink("00000000-0000-4000-8000-0000000000ff" as LinkId, { title: "X", tags: [] })).toBe(false);
  });

  it("deleteLink then restoreLink gives back an identical row, to the microsecond", async () => {
    const id = await seedRead();
    await db.update(links).set({ readAt: sql`now()`, createdAt: sql`now() - interval '1.234567 seconds'` });
    const exact = () => db.execute(sql`select id, url, title, tags, read_at::text, created_at::text, updated_at::text from links`);
    const before = await exact();

    const deleted = await deleteLink(id);
    expect(await db.select().from(links)).toEqual([]);
    expect(await restoreLink(deleted!)).toBe(true);

    expect(await exact()).toEqual(before);
  });

  it("restoreLink returns false when the url was saved again in between", async () => {
    const id = await seedRead();
    const deleted = await deleteLink(id);
    await db.insert(links).values({ url: "https://example.com/a", title: "Saved again" });

    expect(await restoreLink(deleted!)).toBe(false);
    expect((await db.select().from(links)).map((row) => row.title)).toEqual(["Saved again"]);
  });

  it("deleteLink returns null for an unknown id", async () => {
    expect(await deleteLink("00000000-0000-4000-8000-0000000000ff" as LinkId)).toBeNull();
  });
});

describe("unread state", () => {
  beforeEach(async () => {
    await db.insert(links).values(
      Array.from({ length: 6 }, (_, i) => ({
        url: `https://example.com/${i + 1}`,
        title: `Link ${i + 1}`,
        tags: i % 2 === 0 ? ["rust"] : [],
        readAt: i < 2 ? at(30) : null,
        createdAt: at(i + 1),
      })),
    );
  });

  it("returns only unread rows, newest first", async () => {
    const { links: rows } = await listPage({ tag: null, page: 1, state: "unread" });

    expect(rows.map((row) => row.title)).toEqual(["Link 6", "Link 5", "Link 4", "Link 3"]);
  });

  it("counts only unread rows in the total", async () => {
    expect((await listPage({ tag: null, page: 1, state: "unread" })).total).toBe(4);
    expect((await listPage({ tag: null, page: 1, state: "all" })).total).toBe(6);
  });

  it("countUnread matches the unread total with and without a tag", async () => {
    expect(await countUnread({ tag: null })).toBe(4);
    const rust = await listPage({ tag: "rust" as Tag, page: 1, state: "unread" });
    expect(await countUnread({ tag: "rust" as Tag })).toBe(rust.total);
    expect(rust.total).toBe(2);
  });
});
