import { sql } from "drizzle-orm";
import { expect, test } from "@playwright/test";
import { db, sql as client } from "../db/client";

test.beforeEach(async () => {
  await db.execute(sql`truncate table links`);
});

test.afterAll(async () => {
  await client.end();
});

test("home shows an empty shelf", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No links yet")).toBeVisible();
});
