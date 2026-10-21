import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expect, test, type Page } from "@playwright/test";
import { links } from "../db/schema";

// home.spec.ts closes the shared db/client connection in its afterAll and the worker keeps its modules, so this file opens its own.
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

test.beforeEach(async () => {
  await db.execute(sql`truncate table links`);
});

test.afterAll(async () => {
  await client.end();
});

async function save(page: Page, fields: { url: string; title: string; tags?: string }) {
  await page.getByLabel("URL", { exact: true }).fill(fields.url);
  await page.getByLabel("Title", { exact: true }).fill(fields.title);
  await page.getByLabel("Tags", { exact: true }).fill(fields.tags ?? "");
  await page.getByRole("button", { name: "Save", exact: true }).click();
}

test("a save shows the new row first", async ({ page }) => {
  await db.insert(links).values({
    url: "https://example.com/old",
    title: "Old",
    createdAt: new Date(Date.UTC(2025, 0, 1)),
  });
  await page.goto("/");

  await save(page, { url: "https://example.com/a", title: "First", tags: "news, rust" });

  await expect(page.getByRole("status")).toHaveText("Saved First");
  const rows = page.getByTestId("link-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.first().getByRole("link").first()).toHaveText("First");
  await expect(rows.first().getByRole("link").first()).toHaveAttribute("href", "https://example.com/a");
  await expect(rows.first().getByTestId("tag")).toHaveText(["news", "rust"]);
  await expect(rows.first()).toContainText("example.com");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
});

test("saving the same url in other casing updates the row", async ({ page }) => {
  await page.goto("/");
  await save(page, { url: "https://example.com/a", title: "First", tags: "news" });
  await expect(page.getByRole("status")).toHaveText("Saved First");

  await save(page, { url: "HTTPS://Example.com/a#top", title: "Renamed", tags: "web" });

  await expect(page.getByRole("status")).toHaveText("Updated Renamed");
  const rows = page.getByTestId("link-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByRole("link").first()).toHaveText("Renamed");
  await expect(rows.first().getByTestId("tag")).toHaveText(["web"]);
});

test("an empty title shows the title error and adds no row", async ({ page }) => {
  await page.goto("/");

  await save(page, { url: "https://example.com/a", title: "  ", tags: "news" });

  const title = page.getByLabel("Title", { exact: true });
  await expect(page.getByText("Enter a title")).toBeVisible();
  await expect(title).toHaveAccessibleDescription("Enter a title");
  await expect(page.getByLabel("URL", { exact: true })).toHaveValue("https://example.com/a");
  await expect(page.getByLabel("Tags", { exact: true })).toHaveValue("news");
  await expect(page.getByTestId("link-row")).toHaveCount(0);
  await expect(page.getByText("No links yet")).toBeVisible();
  expect(await db.select().from(links)).toHaveLength(0);
});

test("the form keeps typed values after an invalid save and clears after each success", async ({ page }) => {
  await page.goto("/");
  const url = page.getByLabel("URL", { exact: true });
  const title = page.getByLabel("Title", { exact: true });
  const tags = page.getByLabel("Tags", { exact: true });

  await save(page, { url: "https://example.com/a", title: " ", tags: "news" });
  await expect(page.getByText("Enter a title")).toBeVisible();
  await expect(url).toHaveValue("https://example.com/a");
  await expect(tags).toHaveValue("news");

  await save(page, { url: "https://example.com/a", title: "First", tags: "news" });
  await expect(page.getByRole("status")).toHaveText("Saved First");
  await expect(url).toHaveValue("");
  await expect(title).toHaveValue("");
  await expect(tags).toHaveValue("");

  await save(page, { url: "https://example.com/b", title: "Second", tags: "rust" });
  await expect(page.getByRole("status")).toHaveText("Saved Second");
  await expect(url).toHaveValue("");
  await expect(title).toHaveValue("");
  await expect(tags).toHaveValue("");
});
