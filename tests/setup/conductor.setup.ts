import { test as setup, expect } from "@playwright/test";
import { ConductorLoginPage } from "../../pages/LoginPage";
import path from "path";

const authFile = path.join(__dirname, "../../.auth/conductor.json");

setup("authenticate fe-conductor", async ({ page }) => {
  const loginPage = new ConductorLoginPage(page);
  await page.goto(process.env.FE_CONDUCTOR_URL!);
  await loginPage.login(process.env.CONDUCTOR_USER!, process.env.CONDUCTOR_PASS!);
  
  await expect(page).not.toHaveURL(/.*login/);
  await page.context().storageState({ path: authFile });
});
