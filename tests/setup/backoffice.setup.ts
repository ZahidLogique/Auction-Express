import { test as setup, expect } from "@playwright/test";
import { BackofficeLoginPage } from "../../pages/LoginPage";
import path from "path";

const authFile = path.join(__dirname, "../../.auth/backoffice.json");

setup("authenticate backoffice", async ({ page }) => {
  const loginPage = new BackofficeLoginPage(page);
  await page.goto(process.env.BACKOFFICE_URL!);
  await loginPage.login(process.env.ADMIN_USER!, process.env.ADMIN_PASS!);
  
  // Tunggu URL berubah atau elemen khusus admin muncul
  await expect(page).not.toHaveURL(/.*login/);
  await page.context().storageState({ path: authFile });
});
