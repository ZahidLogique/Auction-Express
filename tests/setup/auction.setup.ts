import { test as setup, expect } from "@playwright/test";
import { AuctionLoginPage } from "../../pages/LoginPage";
import path from "path";

const authFile = path.join(__dirname, "../../.auth/auction.json");

setup("authenticate fe-auction", async ({ page }) => {
  const loginPage = new AuctionLoginPage(page);
  await page.goto(process.env.FE_AUCTION_URL!);
  await loginPage.login(process.env.AUCTION_USER!, process.env.AUCTION_PASS!);
  
  // Tunggu elemen yang menandakan login sukses (nama user)
  await expect(page.getByText(/Hello,/)).toBeVisible({ timeout: 15000 });
  
  await page.context().storageState({ path: authFile });
});
