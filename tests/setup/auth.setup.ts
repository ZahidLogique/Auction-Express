import { test as setup, expect } from "@playwright/test";
import { LoginPage } from "../../pages/backoffice/LoginPage";
import path from "path";

const authFile = path.join(__dirname, "../../.auth/user.json");

setup("authenticate", async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(
    process.env.APP_USERNAME ?? "",
    process.env.APP_PASSWORD ?? ""
  );

  await expect(page).toHaveURL(/.*\/dashboard/);

  await page.context().storageState({ path: authFile });
});
