import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expect, test, type Page } from "@playwright/test";
import { links } from "../db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

test.beforeEach(async () => {
  await db.execute(sql`truncate table links`);
  await db.insert(links).values([
    { url: "https://example.com/1", title: "Learning Rust", tags: ["rust"], createdAt: new Date(Date.UTC(2025, 0, 1)) },
    { url: "https://rust-lang.org/", title: "Home", createdAt: new Date(Date.UTC(2025, 0, 2)) },
    { url: "https://example.com/3", title: "Cooking", createdAt: new Date(Date.UTC(2025, 0, 3)) },
  ]);
});

test.afterAll(async () => {
  await client.end();
});

const titles = (page: Page) => page.getByTestId("link-row").locator("> a");

async function search(page: Page, q: string) {
  await page.getByRole("searchbox", { name: "Search" }).fill(q);
  await page.getByRole("button", { name: "Search", exact: true }).click();
}

test("a search filters the list and Clear search restores it", async ({ page }) => {
  await page.goto("/");

  await search(page, "RUST");

  await expect(page).toHaveURL("/?q=RUST");
  await expect(page.getByText("Results for “RUST”")).toBeVisible();
  await expect(titles(page)).toHaveText(["Home", "Learning Rust"]);

  await page.getByRole("link", { name: "Clear search" }).click();
  await expect(page).toHaveURL("/");
  await expect(titles(page)).toHaveText(["Cooking", "Home", "Learning Rust"]);
});

test("a search with no match shows the empty message", async ({ page }) => {
  await page.goto("/");

  await search(page, "nothing-matches");

  await expect(page.getByText("No links match \"nothing-matches\"")).toBeVisible();
  await expect(page.getByTestId("link-row")).toHaveCount(0);
});
