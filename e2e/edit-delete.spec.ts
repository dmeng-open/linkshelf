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
    { url: "https://example.com/1", title: "Old", tags: ["web"], createdAt: at(1) },
    { url: "https://example.com/2", title: "Middle", tags: ["news"], readAt: at(9), createdAt: at(2) },
    { url: "https://example.com/3", title: "New", createdAt: at(3) },
  ]);
});

test.afterAll(async () => {
  await client.end();
});

const titles = (page: Page) => page.getByTestId("link-row").locator("> a");
const row = (page: Page, title: string) =>
  page.getByTestId("link-row").filter({ has: page.getByRole("link", { name: title, exact: true }) });

test("edit saves a new title and new tags", async ({ page }) => {
  await page.goto("/");
  await row(page, "Middle").getByRole("button", { name: "Edit" }).click();

  await page.getByLabel("Edit title").fill("Renamed");
  await page.getByLabel("Edit tags").fill("a, b");
  await page.getByRole("button", { name: "Save", exact: true }).last().click();

  await expect(titles(page)).toHaveText(["New", "Renamed", "Old"]);
  await expect(row(page, "Renamed").getByTestId("tag")).toHaveText(["a", "b"]);
  await page.reload();
  await expect(row(page, "Renamed")).toContainText("Read");
});

test("an empty title shows the field error and changes nothing", async ({ page }) => {
  await page.goto("/");
  await row(page, "Middle").getByRole("button", { name: "Edit" }).click();

  await page.getByLabel("Edit title").fill("  ");
  await page.getByRole("button", { name: "Save", exact: true }).last().click();

  await expect(page.getByLabel("Edit title")).toHaveAccessibleDescription("Enter a title");
  const [middle] = await db.select().from(links).where(sql`url = 'https://example.com/2'`);
  expect(middle.title).toBe("Middle");
});

test("delete then Undo restores the row in its original position", async ({ page }) => {
  await page.goto("/");
  await row(page, "Middle").getByRole("button", { name: "Delete" }).click();

  await expect(page.getByTestId("deleted-row")).toContainText("Deleted Middle.");
  expect(await db.select().from(links)).toHaveLength(2);

  await page.getByRole("button", { name: "Undo" }).click();

  await expect(titles(page)).toHaveText(["New", "Middle", "Old"]);
  await expect(row(page, "Middle")).toContainText("Read");
  await page.reload();
  await expect(titles(page)).toHaveText(["New", "Middle", "Old"]);
});

test("a deleted row stays gone after a reload", async ({ page }) => {
  await page.goto("/");
  await row(page, "Old").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId("deleted-row")).toContainText("Deleted Old.");

  await page.reload();

  await expect(titles(page)).toHaveText(["New", "Middle"]);
});
