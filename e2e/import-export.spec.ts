import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expect, test } from "@playwright/test";
import { links } from "../db/schema";
import { parseBookmarksHtml } from "../lib/bookmarks";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

test.beforeEach(async () => {
  await db.execute(sql`truncate table links`);
  await db.insert(links).values({ url: "https://example.com/existing", title: "Existing", tags: ["mine"] });
});

test.afterAll(async () => {
  await client.end();
});

test("importing a bookmarks file shows the counts and the new rows", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Import" }).click();

  await page.getByLabel("Bookmarks file").setInputFiles("e2e/fixtures/bookmarks.html");
  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByRole("status")).toHaveText("Imported 2, skipped 1 already saved, 1 invalid");
  await page.getByRole("link", { name: "Back to your shelf" }).click();
  const titles = page.getByTestId("link-row").locator("> a");
  await expect(titles).toHaveCount(3);
  expect((await titles.allTextContents()).sort()).toEqual(["Existing", "New one", "New two"]);
  const [existing] = await db.select().from(links).where(sql`url = 'https://example.com/existing'`);
  expect(existing.title).toBe("Existing");
});

test("export downloads a file that parses back to every row", async ({ page }) => {
  await db.insert(links).values(
    Array.from({ length: 30 }, (_, i) => ({ url: `https://example.com/${i}`, title: `Title <${i}> & "q"`, tags: ["t"] })),
  );
  await page.goto("/");

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export" }).click();
  const file = await download;

  expect(file.suggestedFilename()).toMatch(/^linkshelf-\d{4}-\d{2}-\d{2}\.html$/);
  const parsed = parseBookmarksHtml(await readFile((await file.path())!, "utf8"));
  const rows = await db.select({ url: links.url, title: links.title, tags: links.tags }).from(links);
  expect(parsed.invalid).toBe(0);
  expect(new Set(parsed.links.map((link) => JSON.stringify(link)))).toEqual(
    new Set(rows.map((row) => JSON.stringify(row))),
  );
});
