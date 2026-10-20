import { expect, test, type Page } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

async function signIn(page: Page, password: string) {
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("a signed-out visit to / lands on /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login?next=%2F");
});

test("a wrong password shows Wrong password", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, "wrong");
  await expect(page.getByText("Wrong password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
});

test("the right password lands on /", async ({ page }) => {
  await page.goto("/");
  await signIn(page, process.env.LINKSHELF_PASSWORD!);
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Linkshelf" })).toBeVisible();
});

test("sign out returns to /login and / redirects again", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, process.env.LINKSHELF_PASSWORD!);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
  await page.goto("/");
  await expect(page).toHaveURL("/login?next=%2F");
});

test("a login with next=//evil.example lands on /", async ({ page }) => {
  for (const next of ["//evil.example", "/\\evil.example", "/\t/evil.example", "/\t\\evil.example", "/\n/evil.example"]) {
    await page.context().clearCookies();
    await page.goto(`/login?${new URLSearchParams({ next })}`);
    await signIn(page, process.env.LINKSHELF_PASSWORD!);
    await expect(page, `next=${JSON.stringify(next)}`).toHaveURL("/");
  }
});
