import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { LoginPage } from "../../pages/LoginPage";
import { takeScreenshot } from "../../helpers/screenshot";

const { Given, When, Then } = createBdd();

// ─── Given ───────────────────────────────────────────────────────────────────

Given("saya berada di halaman login AX", async ({ page, $testInfo }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await takeScreenshot(page, $testInfo, "Login Page Loaded");
});

// ─── When ────────────────────────────────────────────────────────────────────

When("saya memasukkan username dan password yang valid", async ({ page, $testInfo }) => {
  const loginPage = new LoginPage(page);
  await loginPage.usernameInput.fill(process.env.APP_USERNAME ?? "");
  await loginPage.passwordInput.fill(process.env.APP_PASSWORD ?? "");
  await takeScreenshot(page, $testInfo, "Credentials Filled");
});

When("saya klik tombol Sign In", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.loginButton.click();
});

// ─── Then ────────────────────────────────────────────────────────────────────

Then("saya seharusnya diarahkan ke halaman dashboard", async ({ page, $testInfo }) => {
  await expect(page).toHaveURL(/.*\/dashboard/);
  await takeScreenshot(page, $testInfo, "Dashboard Loaded");
});
