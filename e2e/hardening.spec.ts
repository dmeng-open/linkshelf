import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { expect, test } from "@playwright/test";
import { links } from "../db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

test.afterAll(async () => {
  await client.end();
});

const HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
};

for (const path of ["/", "/login"]) {
  test(`${path} sends every security header and no x-powered-by`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    const headers = response.headers();
    for (const [name, value] of Object.entries(HEADERS)) expect(headers[name], name).toBe(value);
    expect(headers["x-powered-by"]).toBeUndefined();
  });
}

test("a missing page shows Page not found", async ({ page }) => {
  const response = await page.goto("/no-such-page");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to your shelf" })).toHaveAttribute("href", "/");
});

test("a saved link opens in a new tab without an opener", async ({ page }) => {
  await db.execute(sql`truncate table links`);
  await db.insert(links).values({ url: "https://example.com/a", title: "First" });
  await page.goto("/");

  const title = page.getByRole("link", { name: "First", exact: true });
  await expect(title).toHaveAttribute("target", "_blank");
  await expect(title).toHaveAttribute("rel", "noopener noreferrer");
});

test("health answers ok while the database is up", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.text()).toBe("ok");
});
