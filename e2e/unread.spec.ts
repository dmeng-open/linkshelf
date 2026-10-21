import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expect, test, type Page } from "@playwright/test";
import { links } from "../db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

test.beforeEach(async () => {
  await db.execute(sql`truncate table links`);
});

test.afterAll(async () => {
  await client.end();
});

const titles = (page: Page) => page.getByTestId("link-row").locator("> a");
const readState = (page: Page) => page.getByRole("navigation", { name: "Read state" });

test("Unread only hides read links and keeps state across the pager", async ({ page }) => {
  await db.insert(links).values(
    Array.from({ length: 45 }, (_, i) => ({
      url: `https://example.com/${i + 1}`,
      title: `Link ${i + 1}`,
      readAt: i + 1 > 40 ? new Date() : null,
      createdAt: new Date(Date.UTC(2025, 0, 1, 0, i + 1)),
    })),
  );
  await page.goto("/");
  await expect(readState(page)).toContainText("40 unread");

  await readState(page).getByRole("link", { name: "Unread only" }).click();

  await expect(page).toHaveURL("/?state=unread");
  await expect(titles(page).first()).toHaveText("Link 40");
  const pager = page.getByRole("navigation", { name: "Pages" });
  await expect(pager).toContainText("Page 1 of 2");
  await pager.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL("/?state=unread&page=2");
  await expect(page.getByTestId("link-row")).toHaveCount(20);
  await expect(readState(page).getByRole("link", { name: "All" })).toHaveAttribute("href", "/");
});

test("marking the last unread link read shows Nothing left to read", async ({ page }) => {
  await db.insert(links).values([
    { url: "https://example.com/read", title: "Done", readAt: new Date() },
    { url: "https://example.com/unread", title: "Todo" },
  ]);
  await page.goto("/?state=unread");
  await expect(titles(page)).toHaveText(["Todo"]);

  await page.getByRole("button", { name: "Mark read" }).click();

  await expect(page.getByText("Nothing left to read")).toBeVisible();
  await expect(readState(page)).toContainText("0 unread");
});
