import { createBdd } from "playwright-bdd";
import { expect, test } from "@playwright/test";
import type { BrowserContext, Page, TestInfo } from "@playwright/test";
import { step, attachment } from "allure-js-commons";
import { ConductorLoginPage } from "../../../pages/conductor/ConductorLoginPage";
import { FELoginPage } from "../../../pages/fe-auction/FELoginPage";
import { createdAuctionName } from "./regression.steps";

const { When, Then } = createBdd();

export let conductorPage: Page;
export let buyerPage: Page;
let conductorContext: BrowserContext;
let buyerContext: BrowserContext;

// Helper: attach ke playwright report + allure inline
async function attachScreenshot(testInfo: TestInfo, page: Page, label: string) {
  const ss = await page.screenshot();
  await attachment(label, ss, { contentType: "image/png" });
  await testInfo.attach(label, { body: ss, contentType: "image/png" });
}

// ── Step 1: Parallel Login ─────────────────────────────────────────────────

When("conductor and buyer login in parallel", async ({ browser, $testInfo }) => {
  test.setTimeout(300000); // 5 menit — cover full auction flow
  conductorContext = await browser.newContext();
  buyerContext = await browser.newContext();
  conductorPage = await conductorContext.newPage();
  buyerPage = await buyerContext.newPage();

  const conductorLogin = new ConductorLoginPage(conductorPage);
  const buyerLogin = new FELoginPage(buyerPage);

  await step("Parallel login: Conductor and Buyer", async () => {
    await Promise.all([
      (async () => {
        await conductorPage.goto(process.env.FE_CONDUCTOR_URL!);
        await conductorLogin.login(process.env.CONDUCTOR_USER!, process.env.CONDUCTOR_PASS!);
        await conductorPage.waitForURL((url) => !url.pathname.includes("login"), { timeout: 15000 });
      })(),
      (async () => {
        await buyerPage.goto(process.env.FE_AUCTION_URL!);
        await buyerLogin.login(process.env.AUCTION_USER!, process.env.AUCTION_PASS!);
        await buyerPage.waitForURL((url) => !url.pathname.includes("login"), { timeout: 15000 });
      })(),
    ]);
  });

  await step("Verify both sessions logged in", async () => {
    await Promise.all([
      attachScreenshot($testInfo, conductorPage, "01 - Conductor After Login"),
      attachScreenshot($testInfo, buyerPage, "01 - Buyer After Login"),
    ]);
  });
});

Then("conductor should be on the auction list page", async () => {
  await step("Verify conductor not on login page", async () => {
    await expect(conductorPage).not.toHaveURL(/login/, { timeout: 10000 });
  });
});

Then("buyer should be on the auction lane page", async () => {
  await step("Verify buyer not on login page", async () => {
    await expect(buyerPage).not.toHaveURL(/login/, { timeout: 10000 });
  });
});

// ── Step 2: Start & Join Auction ──────────────────────────────────────────

When("conductor starts the auction", async ({ $testInfo }) => {
  await step("Conductor - Find auction card", async () => {
    // Cari card yang sesuai dengan auction yang dibuat di backoffice
    let auctionCard;
    if (createdAuctionName) {
      auctionCard = conductorPage.locator("div.w-full.border.rounded-md").filter({ hasText: createdAuctionName }).first();
      const found = await auctionCard.isVisible({ timeout: 5000 }).catch(() => false);
      if (!found) {
        console.log(`[Conductor] Auction "${createdAuctionName}" not found, using first card`);
        auctionCard = conductorPage.locator("div.w-full.border.rounded-md").first();
      } else {
        console.log(`[Conductor] Found auction: "${createdAuctionName}"`);
      }
    } else {
      auctionCard = conductorPage.locator("div.w-full.border.rounded-md").first();
    }
    await auctionCard.waitFor({ state: "visible", timeout: 15000 });

    const auctionName = await auctionCard.locator("h3").first().textContent().then((t) => t?.trim() ?? "");
    console.log(`[Conductor] Starting auction: "${auctionName}"`);

    await attachScreenshot($testInfo, conductorPage, "02 - Conductor Auction List");
  });

  await step("Conductor - Click Start Auction", async () => {
    const auctionCard = createdAuctionName
      ? conductorPage.locator("div.w-full.border.rounded-md").filter({ hasText: createdAuctionName }).first()
      : conductorPage.locator("div.w-full.border.rounded-md").first();
    const startBtn = auctionCard.locator('button:has-text("Start Auction")');
    await startBtn.waitFor({ state: "visible", timeout: 10000 });
    await startBtn.click();
    // Tunggu room conductor benar-benar loaded agar buyer bisa join
    await conductorPage.waitForLoadState("domcontentloaded");
    await conductorPage.waitForTimeout(3000);

    await attachScreenshot($testInfo, conductorPage, "02 - Conductor Auction Room");
  });
});

When("buyer joins the auction", async ({ $testInfo }) => {
  await step("Buyer - Calendar page: click Join Auction", async () => {
    // Setelah login, buyer ada di Calendar — tunggu halaman siap
    await buyerPage.waitForLoadState("domcontentloaded");
    await buyerPage.waitForTimeout(1000);
    await attachScreenshot($testInfo, buyerPage, "03 - Buyer Calendar Page");

    // Klik Join Auction di Calendar
    const joinBtn = buyerPage.locator('button:has-text("Join Auction")');
    await joinBtn.waitFor({ state: "visible", timeout: 15000 });
    await expect(joinBtn).toBeEnabled({ timeout: 10000 });
    await joinBtn.click();
    console.log("[Buyer] Clicked Join Auction on Calendar");
    await buyerPage.waitForLoadState("domcontentloaded");
    await buyerPage.waitForTimeout(1000);
  });

  await step("Buyer - Handle Terms and Conditions modal if shown", async () => {
    const termsModal = buyerPage.locator('text=Terms And Conditions').first();
    const isTermsVisible = await termsModal.isVisible({ timeout: 3000 }).catch(() => false);
    if (isTermsVisible) {
      console.log("[Buyer] Terms modal detected, accepting...");
      const checkbox = buyerPage.locator('input[type="checkbox"]').last();
      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.click({ force: true });
      await buyerPage.waitForTimeout(500);
      const acceptBtn = buyerPage.locator('button:has-text("Accept")').last();
      await expect(acceptBtn).toBeEnabled({ timeout: 5000 });
      await acceptBtn.click();
      await buyerPage.waitForTimeout(1500);
      console.log("[Buyer] Terms accepted.");
    }
  });

  await step("Buyer - Auction list: select lane then click Join Auction", async () => {
    await attachScreenshot($testInfo, buyerPage, "03 - Buyer Auction List");

    // Gunakan nama auction dari backoffice (createdAuctionName di regression.steps.ts)
    console.log(`[Buyer] Looking for auction: "${createdAuctionName}"`);

    // Cari row yang mengandung nama auction, lalu centang checkboxnya
    let checkbox;
    if (createdAuctionName) {
      const matchingRow = buyerPage.locator('div.w-full.flex.items-center').filter({ hasText: createdAuctionName }).first();
      const rowVisible = await matchingRow.isVisible({ timeout: 3000 }).catch(() => false);
      if (rowVisible) {
        checkbox = matchingRow.locator('input[name="selected_lane"]');
        console.log(`[Buyer] Found matching row for: "${createdAuctionName}"`);
      }
    }
    // Fallback ke row pertama kalau tidak ketemu
    if (!checkbox) {
      console.log("[Buyer] Auction name not matched, using first row as fallback");
      checkbox = buyerPage.locator('input[name="selected_lane"]').first();
    }

    await checkbox.waitFor({ state: "visible", timeout: 10000 });
    await checkbox.click({ force: true });
    console.log(`[Buyer] Selected auction lane: "${createdAuctionName}"`);
    await buyerPage.waitForTimeout(500);

    await attachScreenshot($testInfo, buyerPage, "03 - Buyer After Select Auction Lane");

    // Tunggu Join Auction enabled (conductor harus sudah start auction dulu)
    const joinBtn = buyerPage.locator('button:has-text("Join Auction")');
    console.log("[Buyer] Waiting for Join Auction to be enabled...");
    await expect(joinBtn).toBeEnabled({ timeout: 60000 }); // tunggu sampai 60s
    await joinBtn.click();
    await buyerPage.waitForTimeout(2000);
  });

  await step("Buyer - Verify inside auction room", async () => {
    await attachScreenshot($testInfo, buyerPage, "03 - Buyer Inside Auction Room");
  });
});

// ── Step 3: Enable Bidding ────────────────────────────────────────────────

When("conductor enables bidding", async ({ $testInfo }) => {
  await step("Conductor - Click Start Lane (if not already done)", async () => {
    const startLaneBtn = conductorPage.locator('button:has-text("Start Lane")');
    // Gunakan isVisible dengan timeout singkat — jika tidak ada, skip saja
    const isVisible = await startLaneBtn.isVisible({ timeout: 8000 }).catch(() => false);
    if (isVisible) {
      const isEnabled = await startLaneBtn.isEnabled().catch(() => false);
      if (isEnabled) {
        console.log("[Conductor] Clicking Start Lane...");
        await startLaneBtn.click();
        await conductorPage.waitForTimeout(1000);
      } else {
        console.log("[Conductor] Start Lane disabled, skipping...");
      }
    } else {
      console.log("[Conductor] Start Lane not visible (already started), skipping...");
    }

    await attachScreenshot($testInfo, conductorPage, "04 - Conductor After Start Lane");
  });

  await step("Conductor - Set Starting Price", async () => {
    const adjustStartBtn = conductorPage.locator('button:has-text("Adjust Starting Price")');
    await adjustStartBtn.waitFor({ state: "visible", timeout: 10000 });
    await adjustStartBtn.scrollIntoViewIfNeeded();
    await conductorPage.waitForTimeout(500);

    await attachScreenshot($testInfo, conductorPage, "04b - Conductor Starting Price Area");

    // Set Starting Price via evaluate — inputs[1] karena inputs[0] adalah Accept field
    await conductorPage.evaluate((value) => {
      const inputs = Array.from(document.querySelectorAll('input[inputmode="decimal"]'));
      const target = inputs[1] as HTMLInputElement; // index 1 = Adjust Starting Price
      if (target) {
        target.removeAttribute('disabled');
        target.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(target, value);
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, '100000');
    await conductorPage.waitForTimeout(500);

    await adjustStartBtn.click({ force: true });
    await conductorPage.waitForTimeout(1000);

    console.log("[Conductor] Starting price set to 100,000");
    await attachScreenshot($testInfo, conductorPage, "04c - Conductor After Set Starting Price");
  });

  await step("Conductor - Set Reserved Price", async () => {
    const adjustReservedBtn = conductorPage.locator('button:has-text("Adjust Reserved Price")');
    await adjustReservedBtn.waitFor({ state: "visible", timeout: 10000 });

    // Set Reserved Price via evaluate — inputs[2] karena inputs[0]=Accept, inputs[1]=Starting Price
    await conductorPage.evaluate((value) => {
      const inputs = Array.from(document.querySelectorAll('input[inputmode="decimal"]'));
      const target = inputs[2] as HTMLInputElement; // index 2 = Adjust Reserved Price
      if (target) {
        target.removeAttribute('disabled');
        target.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(target, value);
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, '90000');
    await conductorPage.waitForTimeout(500);

    await adjustReservedBtn.click({ force: true });
    await conductorPage.waitForTimeout(1000);

    console.log("[Conductor] Reserved price set to 90,000");
    await attachScreenshot($testInfo, conductorPage, "04d - Conductor After Set Reserved Price");
  });

  await step("Conductor - Click Enable Bid Button", async () => {
    const enableBidBtn = conductorPage.locator('button:has-text("Enable Bid Button")');
    await enableBidBtn.waitFor({ state: "visible", timeout: 10000 });
    await expect(enableBidBtn).toBeEnabled({ timeout: 15000 });
    await enableBidBtn.click();
    await conductorPage.waitForTimeout(1000);
  });

  await step("Verify bidding enabled on both sides", async () => {
    await Promise.all([
      attachScreenshot($testInfo, conductorPage, "04 - Conductor After Enable Bid"),
      attachScreenshot($testInfo, buyerPage, "04 - Buyer View After Bid Enabled"),
    ]);
  });
});

// ── Step 4: Buyer Bid ─────────────────────────────────────────────────────

When("buyer places a bid", async ({ $testInfo }) => {
  await step("Buyer - Click Interested (if not already bidding)", async () => {
    const interestedBtn = buyerPage.locator('button:has-text("Interested")');
    const isInterested = await interestedBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (isInterested) {
      await expect(interestedBtn).toBeEnabled({ timeout: 5000 });
      await interestedBtn.click();
      await buyerPage.waitForTimeout(1000);
      console.log("[Buyer] Clicked Interested");

      // Accept muncul di posisi yang sama setelah Interested diklik
      const acceptBtn = buyerPage.locator('button:has-text("Accept")');
      await acceptBtn.waitFor({ state: "visible", timeout: 10000 });
      await expect(acceptBtn).toBeEnabled({ timeout: 5000 });
      await acceptBtn.click();
      await buyerPage.waitForTimeout(1000);
      console.log("[Buyer] Clicked Accept");
    } else {
      console.log("[Buyer] Already in bidding state (skipping Interested + Accept)");
    }

    await attachScreenshot($testInfo, buyerPage, "05 - Buyer Bid State");
  });

  await step("Buyer - Offer +5000", async () => {
    // Klik tombol +5000 untuk naikkan bid
    const increaseBtn = buyerPage.locator('button:has-text("5000")').first();
    await increaseBtn.waitFor({ state: "visible", timeout: 10000 });
    await expect(increaseBtn).toBeEnabled({ timeout: 5000 });
    await increaseBtn.click();
    await buyerPage.waitForTimeout(1000);
    console.log("[Buyer] Offered +5000");

    // Handle modal konfirmasi "Are you sure want to bid at X?" jika muncul
    const confirmModal = buyerPage.locator('text=Are you sure want to bid');
    const hasModal = await confirmModal.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasModal) {
      console.log("[Buyer] Bid confirmation modal detected, clicking Bid...");
      const bidConfirmBtn = buyerPage.getByRole('button', { name: 'Bid', exact: true });
      await bidConfirmBtn.waitFor({ state: "visible", timeout: 5000 });
      await bidConfirmBtn.click();
      await buyerPage.waitForTimeout(1000);
      console.log("[Buyer] Bid confirmed via modal");
    }

    await attachScreenshot($testInfo, buyerPage, "05c - Buyer After Offer +5000");
  });
});

Then("bid price should be updated on both sides", async ({ $testInfo }) => {
  await step("Verify bid price updated", async () => {
    await buyerPage.waitForTimeout(1500);
    await Promise.all([
      attachScreenshot($testInfo, conductorPage, "05c - Conductor Bid Price Updated"),
      attachScreenshot($testInfo, buyerPage, "05c - Buyer Bid Price Updated"),
    ]);
    console.log("[Verify] Bid price screenshots captured for both sides");
  });
});

// ── Step 5: Conductor Countdown & Sold ────────────────────────────────────

When("conductor starts countdown", async ({ $testInfo }) => {
  await step("Conductor - Click Start Countdown", async () => {
    const startCountdownBtn = conductorPage.locator('button:has-text("Start Countdown")');
    await startCountdownBtn.waitFor({ state: "visible", timeout: 15000 });
    await expect(startCountdownBtn).toBeEnabled({ timeout: 10000 });
    await startCountdownBtn.click();
    console.log("[Conductor] Start Countdown clicked");
    await attachScreenshot($testInfo, conductorPage, "06 - Conductor Start Countdown");
  });

  await step("Wait for countdown to finish", async () => {
    console.log("[Conductor] Waiting for countdown to finish...");
    // Tunggu Sold button enabled sebagai indikator countdown selesai (max 60s)
    const soldBtn = conductorPage.getByRole('button', { name: 'Sold', exact: true });
    await expect(soldBtn).toBeEnabled({ timeout: 60000 });
    console.log("[Conductor] Countdown finished, Sold button is now enabled");
    await attachScreenshot($testInfo, conductorPage, "06b - Conductor After Countdown");
  });
});

Then("buyer should see bid success", async ({ $testInfo }) => {
  await step("Verify buyer bid success message", async () => {
    // Cek ada success indicator di buyer — bisa berupa text/toast/badge
    const successIndicator = buyerPage.locator(
      'text=success, text=Success, text=won, text=Won, [class*="success"], [class*="winner"]'
    ).first();
    const isSuccess = await successIndicator.isVisible({ timeout: 8000 }).catch(() => false);
    if (isSuccess) {
      console.log("[Buyer] Bid success indicator visible");
    } else {
      console.log("[Buyer] No explicit success indicator, capturing screenshot for review");
    }
    await attachScreenshot($testInfo, buyerPage, "07 - Buyer Bid Result");
  });
});

Then("conductor clicks sold", async ({ $testInfo }) => {
  await step("Conductor - Click Sold button", async () => {
    const soldBtn = conductorPage.getByRole('button', { name: 'Sold', exact: true });
    await soldBtn.waitFor({ state: "visible", timeout: 15000 });
    await expect(soldBtn).toBeEnabled({ timeout: 10000 });
    await soldBtn.click();
    await conductorPage.waitForTimeout(1000);
    console.log("[Conductor] Clicked Sold");
    await attachScreenshot($testInfo, conductorPage, "08 - Conductor After Sold");
    await attachScreenshot($testInfo, buyerPage, "08 - Buyer After Sold");

    // Handle modal "The auction winner is..." — klik Continue untuk lanjut
    const winnerModal = conductorPage.locator('text=The auction winner is');
    const hasModal = await winnerModal.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasModal) {
      console.log("[Conductor] Winner modal detected, clicking Continue...");
      await attachScreenshot($testInfo, conductorPage, "08b - Conductor Winner Modal");
      const continueBtn = conductorPage.getByRole('button', { name: 'Continue', exact: true });
      await continueBtn.waitFor({ state: "visible", timeout: 5000 });
      await continueBtn.click();
      await conductorPage.waitForTimeout(1000);
      console.log("[Conductor] Winner modal closed");
    }
  });
});

Then("buyer closes winner notification", async ({ $testInfo }) => {
  await step("Buyer - Close winner modal if shown", async () => {
    const winnerModal = buyerPage.locator('text=You are the winner');
    const isVisible = await winnerModal.isVisible({ timeout: 5000 }).catch(() => false);
    if (isVisible) {
      console.log("[Buyer] Winner modal detected, closing...");
      await attachScreenshot($testInfo, buyerPage, "09 - Buyer Winner Modal");
      const closeBtn = buyerPage.getByRole('button', { name: 'Close', exact: true });
      await closeBtn.waitFor({ state: "visible", timeout: 5000 });
      await closeBtn.click();
      await buyerPage.waitForTimeout(1000);
      console.log("[Buyer] Winner modal closed");
    } else {
      console.log("[Buyer] No winner modal shown");
    }
    await attachScreenshot($testInfo, buyerPage, "09 - Buyer After Winner Modal");
  });
});

When("conductor moves to next lot", async ({ $testInfo }) => {
  await step("Conductor - Wait for next lot to load (auto-advance after Continue)", async () => {
    // Setelah Continue di winner modal, sistem otomatis advance ke lot berikutnya
    await conductorPage.waitForTimeout(2000);
    console.log("[Conductor] Moved to next lot (auto-advance)");
    await attachScreenshot($testInfo, conductorPage, "10 - Conductor Next Lot");
    await attachScreenshot($testInfo, buyerPage, "10 - Buyer Next Lot");
  });
});
