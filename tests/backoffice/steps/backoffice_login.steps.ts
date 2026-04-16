import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { LoginPage } from "../../../pages/LoginPage";

const { Given, When, Then } = createBdd();

// ─── Given ───────────────────────────────────────────────────────────────────

Given("I am on the Backoffice login page", async ({ page }) => {
  await page.goto(process.env.BACKOFFICE_URL!);
});

// ─── When ────────────────────────────────────────────────────────────────────

When("I login with valid admin credentials", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.login(process.env.ADMIN_USER!, process.env.ADMIN_PASS!);
});

// ─── Then ────────────────────────────────────────────────────────────────────

Then("I should be redirected to the Backoffice dashboard", async ({ page }) => {
  await expect(page).not.toHaveURL(/.*login/);
  await expect(page).toHaveURL(/.*dashboard/);
});
