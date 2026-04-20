import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { ConductorLoginPage } from "../../../pages/conductor/ConductorLoginPage";

const { Given, When, Then } = createBdd();

// ─── Given ───────────────────────────────────────────────────────────────────

Given("I am on the FE Conductor login page", async ({ page }) => {
  await page.goto(process.env.FE_CONDUCTOR_URL!);
});

// ─── When ────────────────────────────────────────────────────────────────────

When("I login to FE Conductor with valid admin credentials", async ({ page }) => {
  const loginPage = new ConductorLoginPage(page);
  await loginPage.login(process.env.ADMIN_USER!, process.env.ADMIN_PASS!);
});

// ─── Then ────────────────────────────────────────────────────────────────────

Then("I should be redirected to the FE Conductor dashboard", async ({ page }) => {
  await expect(page).not.toHaveURL(/.*login/);
  await expect(page).toHaveURL(/.*conductor/);
});
