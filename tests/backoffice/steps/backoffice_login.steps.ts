import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { LoginPage } from "../../../pages/backoffice/LoginPage";
import { step, attachment } from "allure-js-commons";

const { Given, When, Then } = createBdd();

// ─── Given ───────────────────────────────────────────────────────────────────

Given("I am on the Backoffice login page", async ({ page, $testInfo }) => {
  await step("Navigate to Backoffice login page", async () => {
    await page.goto(process.env.BACKOFFICE_URL!);
    const ss = await page.screenshot();
    await attachment("Backoffice Login Page", ss, { contentType: "image/png" });
    await $testInfo.attach("01 - Backoffice Login Page", { body: ss, contentType: "image/png" });
  });
});

// ─── When ────────────────────────────────────────────────────────────────────

When("I login with valid admin credentials", async ({ page, $testInfo }) => {
  await step("Fill credentials and submit login form", async () => {
    const loginPage = new LoginPage(page);
    await loginPage.login(process.env.ADMIN_USER!, process.env.ADMIN_PASS!);
    await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 15000 });
    const ss = await page.screenshot();
    await attachment("After Login", ss, { contentType: "image/png" });
    await $testInfo.attach("02 - Backoffice After Login", { body: ss, contentType: "image/png" });
  });
});

// ─── Then ────────────────────────────────────────────────────────────────────

Then("I should be redirected to the Backoffice dashboard", async ({ page }) => {
  await step("Verify redirect to dashboard", async () => {
    await expect(page).not.toHaveURL(/.*login/);
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
