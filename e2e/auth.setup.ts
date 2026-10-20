import { expect, test as setup } from "@playwright/test";
import { STORAGE_STATE } from "../playwright.config";

setup("sign in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.LINKSHELF_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
  await page.context().storageState({ path: STORAGE_STATE });
});
