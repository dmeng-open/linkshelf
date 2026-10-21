import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expect, test, type Page } from "@playwright/test";
import { links } from "../db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const at = (minutes: number) => new Date(Date.UTC(2025, 0, 1, 0, minutes));

test.beforeEach(async () => {
  await db.execute(sql`truncate table links`);
  await db.insert(links).values([
    { url: "https://example.com/1", title: "Old rust", tags: ["rust"], createdAt: at(1) },
    { url: "https://example.com/2", title: "Web only", tags: ["web"], createdAt: at(2) },
    { url: "https://example.com/3", title: "New rust", tags: ["rust", "web"], createdAt: at(3) },
  ]);
});

test.afterAll(async () => {
  await client.end();
});

const titles = (page: Page) => page.getByTestId("link-row").locator("> a");

test("a tag click filters and Clear filter restores the full list", async ({ page }) => {
  await page.goto("/");
  await expect(titles(page)).toHaveText(["New rust", "Web only", "Old rust"]);

  await page.getByTestId("link-row").first().getByRole("link", { name: "rust", exact: true }).click();

  await expect(page).toHaveURL("/?tag=rust");
  await expect(page.getByText("Tagged #rust")).toBeVisible();
  await expect(titles(page)).toHaveText(["New rust", "Old rust"]);

  await page.getByRole("link", { name: "Clear filter" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Tagged #rust")).toHaveCount(0);
  await expect(titles(page)).toHaveText(["New rust", "Web only", "Old rust"]);
});

test("opening /?tag=rust directly shows the same rows as the click", async ({ page }) => {
  await page.goto("/?tag=rust");

  await expect(page.getByText("Tagged #rust")).toBeVisible();
  await expect(titles(page)).toHaveText(["New rust", "Old rust"]);
});

test("a tag with no links shows the empty filter message", async ({ page }) => {
  await page.goto("/?tag=nothing-here");

  await expect(page.getByText("No links tagged #nothing-here")).toBeVisible();
  await expect(page.getByTestId("link-row")).toHaveCount(0);
});
