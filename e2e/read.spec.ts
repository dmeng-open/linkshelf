import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expect, test } from "@playwright/test";
import { links } from "../db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

test.beforeEach(async () => {
  await db.execute(sql`truncate table links`);
  await db.insert(links).values({ url: "https://example.com/a", title: "First" });
});

test.afterAll(async () => {
  await client.end();
});

test("mark read persists across a reload", async ({ page }) => {
  await page.goto("/");
  const row = page.getByTestId("link-row");

  await row.getByRole("button", { name: "Mark read" }).click();
  await expect(row.getByText("Read", { exact: true })).toBeVisible();
  await expect(row.getByRole("button", { name: "Mark unread" })).toBeEnabled();

  await page.reload();
  await expect(row.getByText("Read", { exact: true })).toBeVisible();
  await expect(row.getByRole("button", { name: "Mark unread" })).toBeVisible();
  const [saved] = await db.select().from(links);
  expect(saved.readAt).toBeInstanceOf(Date);
});

test("mark unread restores the unread row", async ({ page }) => {
  await db.update(links).set({ readAt: new Date() });
  await page.goto("/");
  const row = page.getByTestId("link-row");
  await expect(row.getByText("Read", { exact: true })).toBeVisible();

  await row.getByRole("button", { name: "Mark unread" }).click();
  await expect(row.getByRole("button", { name: "Mark read" })).toBeEnabled();
  await expect(row.getByText("Read", { exact: true })).toHaveCount(0);

  await page.reload();
  await expect(row.getByRole("button", { name: "Mark read" })).toBeVisible();
  const [saved] = await db.select().from(links);
  expect(saved.readAt).toBeNull();
});
