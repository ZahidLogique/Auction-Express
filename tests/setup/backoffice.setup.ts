import { test as setup, expect } from "@playwright/test";
import { BackofficeLoginPage } from "../../pages/backoffice/LoginPage";
import path from "path";

const authFile = path.join(__dirname, "../../.auth/backoffice.json");

setup("authenticate backoffice", async ({ page }) => {
  setup.setTimeout(60000);
  const loginPage = new BackofficeLoginPage(page);
  await page.goto(process.env.BACKOFFICE_URL!, { timeout: 60000 });
  await loginPage.login(process.env.ADMIN_USER!, process.env.ADMIN_PASS!);

  // Tunggu redirect ke dashboard setelah login berhasil
  await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });
  await page.context().storageState({ path: authFile });
});
