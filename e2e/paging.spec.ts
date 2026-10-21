import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expect, test, type Page } from "@playwright/test";
import { links } from "../db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

test.beforeEach(async () => {
  await db.execute(sql`truncate table links`);
  await db.insert(links).values(
    Array.from({ length: 45 }, (_, i) => ({
      url: `https://example.com/${i + 1}`,
      title: `Link ${i + 1}`,
      tags: i + 1 > 20 ? ["rust"] : [],
      createdAt: new Date(Date.UTC(2025, 0, 1, 0, i + 1)),
    })),
  );
});

test.afterAll(async () => {
  await client.end();
});

const pager = (page: Page) => page.getByRole("navigation", { name: "Pages" });
const firstTitle = (page: Page) => page.getByTestId("link-row").first().locator("> a");

test("Next and Previous walk the pages in order", async ({ page }) => {
  await page.goto("/");
  await expect(pager(page)).toContainText("Page 1 of 3");
  await expect(firstTitle(page)).toHaveText("Link 45");

  await pager(page).getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL("/?page=2");
  await expect(pager(page)).toContainText("Page 2 of 3");
  await expect(firstTitle(page)).toHaveText("Link 25");

  await pager(page).getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL("/?page=3");
  await expect(page.getByTestId("link-row")).toHaveCount(5);
  await expect(pager(page).getByRole("link", { name: "Next" })).toHaveCount(0);

  await pager(page).getByRole("link", { name: "Previous" }).click();
  await expect(page).toHaveURL("/?page=2");
  await pager(page).getByRole("link", { name: "Previous" }).click();
  await expect(page).toHaveURL("/?page=1");
  await expect(firstTitle(page)).toHaveText("Link 45");
  await expect(pager(page).getByRole("link", { name: "Previous" })).toHaveCount(0);
});

test("a filtered page keeps tag in the pager links", async ({ page }) => {
  await page.goto("/?tag=rust&page=2");

  await expect(pager(page)).toContainText("Page 2 of 2");
  await expect(page.getByTestId("link-row")).toHaveCount(5);
  await expect(pager(page).getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/?tag=rust&page=1");

  await page.goto("/?tag=rust");
  await expect(pager(page).getByRole("link", { name: "Next" })).toHaveAttribute("href", "/?tag=rust&page=2");
});

test("a page past the last links to the last page", async ({ page }) => {
  await page.goto("/?page=99");

  await expect(pager(page)).toContainText("Page 99 does not exist");
  await pager(page).getByRole("link", { name: "Go to page 3" }).click();
  await expect(page).toHaveURL("/?page=3");
});
