import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expect, test, type Page } from "@playwright/test";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async () => {
  await db.execute(sql`truncate table login_failures`);
});

test.afterAll(async () => {
  await db.execute(sql`truncate table login_failures`);
  await client.end();
});

async function signIn(page: Page, password: string) {
  await page.goto("/login");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/login" || url.search.includes("error="));
}

test("the sixth attempt is blocked even with the right password", async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await signIn(page, "wrong-password");
    await expect(page.locator("main").getByRole("alert")).toHaveText("Wrong password");
  }

  await signIn(page, process.env.LINKSHELF_PASSWORD!);

  await expect(page.locator("main").getByRole("alert")).toHaveText("Too many attempts. Try again in 15 minutes.");
  await expect(page).toHaveURL(/\/login/);
});

test("a right password before the limit signs in and clears the count", async ({ page }) => {
  for (let i = 0; i < 4; i++) await signIn(page, "wrong-password");

  await signIn(page, process.env.LINKSHELF_PASSWORD!);
  await expect(page).toHaveURL("/");
  const [{ count }] = await db.execute<{ count: number }>(sql`select count(*)::int as count from login_failures`);
  expect(count).toBe(0);
});
