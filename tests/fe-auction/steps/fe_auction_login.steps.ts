import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { AuctionLoginPage } from "../../../pages/fe-auction/FELoginPage";

const { Given, When, Then } = createBdd();

// ─── Given ───────────────────────────────────────────────────────────────────

Given("I am on the FE Auction login page", async ({ page }) => {
  await page.goto(process.env.FE_AUCTION_URL!);
});

// ─── When ────────────────────────────────────────────────────────────────────

// Kita bisa menggunakan step yang sama atau membedakannya. 
// Untuk menghindari konflik, jika langkahnya sama persis ("I login with valid admin credentials"), 
// kita harus memindahkannya ke Global Steps atau membedakan namanya.
// Saya akan membedakan namanya agar lebih eksplisit untuk sekarang.

When("I login to FE Auction with valid admin credentials", async ({ page }) => {
  const loginPage = new AuctionLoginPage(page);
  await loginPage.login(process.env.ADMIN_USER!, process.env.ADMIN_PASS!);
});

// ─── Then ────────────────────────────────────────────────────────────────────

Then("I should be redirected to the FE Auction dashboard", async ({ page }) => {
  await expect(page).not.toHaveURL(/.*login/);
  await expect(page).toHaveURL(/.*auction/);
});
