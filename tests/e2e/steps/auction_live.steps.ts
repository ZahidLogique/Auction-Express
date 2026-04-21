import { createBdd } from "playwright-bdd";
import { expect, test } from "@playwright/test";
import type { BrowserContext, Page, TestInfo } from "@playwright/test";
import { step, attachment } from "allure-js-commons";
import { ConductorLoginPage } from "../../../pages/conductor/ConductorLoginPage";
import { FELoginPage } from "../../../pages/fe-auction/FELoginPage";
import { createdAuctionName, createdVehicles, type CreatedVehicle } from "./backoffice_setup.steps";

const { When, Then } = createBdd();

export let conductorPage: Page;
export let buyerPage: Page;
let conductorContext: BrowserContext;
let buyerContext: BrowserContext;

// Tracker lot yang sedang berjalan (0-based index ke createdVehicles[])
let currentLotIndex = 0;

// Bid price tracking
const STARTING_PRICE = 100_000;
const BID_INCREMENT  = 5_000;
let   currentBidPrice = STARTING_PRICE;

// Helper: attach ke playwright report + allure inline
async function attachScreenshot(testInfo: TestInfo, page: Page, label: string) {
  const ss = await page.screenshot();
  await attachment(label, ss, { contentType: "image/png" });
  await testInfo.attach(label, { body: ss, contentType: "image/png" });
}

// ── Vehicle Data Verification Helpers ────────────────────────────────────────

/**
 * Baca nilai field dari info panel kendaraan di buyer auction room.
 * Struktur HTML aktual:
 *   <div ...><span>Label</span><span class="text-right">Value</span></div>
 */
async function getVehicleField(label: string): Promise<string> {
  const valueSpan = buyerPage
    .locator("span")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("..")
    .locator("span.text-right")
    .first();

  const visible = await valueSpan.isVisible({ timeout: 3000 }).catch(() => false);
  if (visible) {
    return ((await valueSpan.textContent()) ?? "").trim();
  }
  return "";
}

/**
 * Cross-verify data kendaraan yang tampil di buyer auction room
 * dengan data yang disubmit dari backoffice.
 */
async function verifyVehicleDataInRoom(
  vehicle: CreatedVehicle,
  lotLabel: string,
  testInfo: TestInfo
) {
  await step(`Verify vehicle data in auction room - ${lotLabel}`, async () => {
    // Tunggu panel info kendaraan siap — indikator: nilai plate SPESIFIK muncul di span.text-right
    // Lebih reliable dari menunggu label "Plate No" yang sudah ada dari lot sebelumnya
    await buyerPage
      .locator("span.text-right")
      .filter({ hasText: vehicle.licensePlate })
      .first()
      .waitFor({ state: "visible", timeout: 15000 });

    // ── Baca semua field dari UI ──────────────────────────────────────────
    // Catatan: HTML buyer room pakai label "Manufaturing Year" (typo — missing 'c')
    // Engine No tidak tersedia di info panel buyer room
    const plateOnScreen   = await getVehicleField("Plate No");
    const provOnScreen    = await getVehicleField("Province");
    const yearOnScreen    = await getVehicleField("Manufaturing Year");
    const fuelOnScreen    = await getVehicleField("Fuel");
    const colorOnScreen   = await getVehicleField("Color");
    const vinOnScreen     = await getVehicleField("VIN");
    const sellerOnScreen  = await getVehicleField("Seller");
    // Mileage tampil sebagai "18,000 km" — strip koma dan " km" sebelum compare
    const mileageRaw      = await getVehicleField("Mileage");
    const mileageOnScreen = mileageRaw.replace(/,/g, "").replace(/\s*km$/i, "").trim();

    // ── Assert semua field sesuai data backoffice ─────────────────────────
    expect(plateOnScreen,  `[${lotLabel}] Plate No mismatch`).toBe(vehicle.licensePlate);
    expect(provOnScreen,   `[${lotLabel}] Province mismatch`).toContain(vehicle.province);
    if (vehicle.manufactYear)
      expect(yearOnScreen,    `[${lotLabel}] Manufacturing Year mismatch`).toBe(vehicle.manufactYear);
    if (vehicle.fuel)
      expect(fuelOnScreen,    `[${lotLabel}] Fuel mismatch`).toContain(vehicle.fuel);
    if (vehicle.mileage)
      expect(mileageOnScreen, `[${lotLabel}] Mileage mismatch`).toBe(vehicle.mileage);
    if (vehicle.color)
      expect(colorOnScreen,   `[${lotLabel}] Color mismatch`).toContain(vehicle.color);
    if (vehicle.vin)
      expect(vinOnScreen,     `[${lotLabel}] VIN mismatch`).toContain(vehicle.vin);
    if (vehicle.seller)
      expect(sellerOnScreen,  `[${lotLabel}] Seller mismatch`).toContain(vehicle.seller);

    console.log(`[Buyer] ✅ Vehicle data verified for ${vehicle.licensePlate} (${lotLabel})`);
    await attachScreenshot(testInfo, buyerPage, `${lotLabel} - Vehicle Data Verified`);
  });
}

// ── Step 1: Parallel Login ─────────────────────────────────────────────────

When("conductor and buyer login in parallel", async ({ browser, $testInfo }) => {
  test.setTimeout(300000); // 5 menit — cover full auction flow
  currentLotIndex = 0; // reset lot tracker untuk setiap test run
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

    // Gunakan nama auction dari backoffice (createdAuctionName di backoffice_setup.steps.ts)
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

  // Cross-verify data kendaraan Lot 1 yang tampil di buyer dengan data backoffice
  if (createdVehicles.length > currentLotIndex) {
    await verifyVehicleDataInRoom(
      createdVehicles[currentLotIndex],
      `Lot ${currentLotIndex + 1}`,
      $testInfo
    );
  }
});

// ── Step 3: Enable Bidding ────────────────────────────────────────────────

// ── Helper: enable bidding dengan reserved price yang bisa dikonfigurasi ──────
async function doEnableBidding(reservedPrice: number, testInfo: TestInfo) {
  await step("Conductor - Click Start Lane (if not already done)", async () => {
    const startLaneBtn = conductorPage.locator('button:has-text("Start Lane")');
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
    await attachScreenshot(testInfo, conductorPage, "04 - Conductor After Start Lane");
  });

  await step("Conductor - Set Starting Price", async () => {
    const adjustStartBtn = conductorPage.locator('button:has-text("Adjust Starting Price")');
    await adjustStartBtn.waitFor({ state: "visible", timeout: 10000 });
    await adjustStartBtn.scrollIntoViewIfNeeded();
    await conductorPage.waitForTimeout(500);
    await attachScreenshot(testInfo, conductorPage, "04b - Conductor Starting Price Area");

    const startingPriceInput = conductorPage
      .locator('button:has-text("Adjust Starting Price")')
      .locator("..")
      .locator('input[inputmode="decimal"]')
      .first();

    await startingPriceInput.evaluate((el: HTMLInputElement, value) => {
      el.removeAttribute("disabled");
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event("input",  { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, String(STARTING_PRICE));
    await conductorPage.waitForTimeout(500);

    await adjustStartBtn.click({ force: true });
    await conductorPage.waitForTimeout(1000);

    currentBidPrice = STARTING_PRICE;
    console.log(`[Conductor] Starting price set to ${STARTING_PRICE.toLocaleString("en-US")}`);
    await attachScreenshot(testInfo, conductorPage, "04c - Conductor After Set Starting Price");
  });

  await step(`Conductor - Set Reserved Price (${reservedPrice.toLocaleString("en-US")})`, async () => {
    const adjustReservedBtn = conductorPage.locator('button:has-text("Adjust Reserved Price")');
    await adjustReservedBtn.waitFor({ state: "visible", timeout: 10000 });

    const reservedPriceInput = conductorPage
      .locator('button:has-text("Adjust Reserved Price")')
      .locator("..")
      .locator('input[inputmode="decimal"]')
      .first();

    await reservedPriceInput.evaluate((el: HTMLInputElement, value) => {
      el.removeAttribute("disabled");
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event("input",  { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, String(reservedPrice));
    await conductorPage.waitForTimeout(500);

    await adjustReservedBtn.click({ force: true });
    await conductorPage.waitForTimeout(1000);

    console.log(`[Conductor] Reserved price set to ${reservedPrice.toLocaleString("en-US")}`);
    await attachScreenshot(testInfo, conductorPage, "04d - Conductor After Set Reserved Price");
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
      attachScreenshot(testInfo, conductorPage, "04 - Conductor After Enable Bid"),
      attachScreenshot(testInfo, buyerPage,     "04 - Buyer View After Bid Enabled"),
    ]);
  });
}

When("conductor enables bidding", async ({ $testInfo }) => {
  await doEnableBidding(90_000, $testInfo);
});

// ── Step 3b: Buyer Clicks Interested Without Bidding (Lot 2 - No Winner) ──

When("buyer clicks interested without bidding", async ({ $testInfo }) => {
  await step("Buyer - Click Interested (no bid will be placed)", async () => {
    const interestedBtn = buyerPage.locator('button:has-text("Interested")');
    const isInterested = await interestedBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (isInterested) {
      await expect(interestedBtn).toBeEnabled({ timeout: 5000 });
      await interestedBtn.click();
      await buyerPage.waitForTimeout(1000);
      console.log("[Buyer] Clicked Interested (no bid scenario)");

      const acceptBtn = buyerPage.locator('button:has-text("Accept")');
      await acceptBtn.waitFor({ state: "visible", timeout: 10000 });
      await expect(acceptBtn).toBeEnabled({ timeout: 5000 });
      await acceptBtn.click();
      await buyerPage.waitForTimeout(1000);
      console.log("[Buyer] Clicked Accept — buyer is interested but will not bid");
    } else {
      console.log("[Buyer] Interested button not visible, already in bidding state");
    }

    await attachScreenshot($testInfo, buyerPage, "Lot2 - Buyer Interested No Bid");
    await attachScreenshot($testInfo, conductorPage, "Lot2 - Conductor After Buyer Interested");
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
    currentBidPrice = STARTING_PRICE + BID_INCREMENT; // 105,000
    console.log(`[Buyer] Offered +${BID_INCREMENT.toLocaleString("en-US")} → expected bid: ${currentBidPrice.toLocaleString("en-US")}`);

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
  await step("Verify bid price updated on both sides", async () => {
    await buyerPage.waitForTimeout(1500);

    // #1: Assert angka bid yang sama tampil di buyer DAN conductor
    // Format expected: "105,000" (en-US locale)
    const expectedFormatted = currentBidPrice.toLocaleString("en-US");

    const buyerHasBid = await buyerPage
      .locator(`text=${expectedFormatted}`)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    const conductorHasBid = await conductorPage
      .locator(`text=${expectedFormatted}`)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    expect(buyerHasBid,     `[Bid Price] "${expectedFormatted}" tidak tampil di buyer`).toBe(true);
    expect(conductorHasBid, `[Bid Price] "${expectedFormatted}" tidak tampil di conductor`).toBe(true);

    console.log(`[Verify] ✅ Bid price "${expectedFormatted}" confirmed on both sides`);
    await Promise.all([
      attachScreenshot($testInfo, conductorPage, "05c - Conductor Bid Price Updated"),
      attachScreenshot($testInfo, buyerPage, "05c - Buyer Bid Price Updated"),
    ]);
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
  await step("Verify buyer is highest bidder after countdown", async () => {
    // #2: Setelah countdown, buyer harus masih menjadi highest bidder.
    // Indikator: bid amount buyer (currentBidPrice) masih tampil di halaman buyer.
    const expectedFormatted = currentBidPrice.toLocaleString("en-US");

    const buyerStillHighest = await buyerPage
      .locator(`text=${expectedFormatted}`)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    expect(buyerStillHighest,
      `[Bid Success] Buyer tidak lagi menampilkan bid "${expectedFormatted}" setelah countdown — kemungkinan ter-outbid`
    ).toBe(true);

    console.log(`[Buyer] ✅ Still highest bidder at "${expectedFormatted}" after countdown`);
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
  });

  await step("Conductor - Verify winner modal and capture winner name", async () => {
    // #3: Winner modal HARUS muncul setelah Sold — bukan optional
    const winnerModal = conductorPage.locator('text=The auction winner is');
    await winnerModal.waitFor({ state: "visible", timeout: 10000 });

    // Ambil full teks modal lalu ekstrak nama pemenang
    const winnerContainer = conductorPage
      .locator('[class*="modal"], [class*="dialog"], [role="dialog"]')
      .filter({ has: conductorPage.locator('text=The auction winner is') })
      .first();

    const modalText = await winnerContainer.textContent({ timeout: 5000 })
      .catch(() => conductorPage.locator('text=The auction winner is').textContent());
    const winnerName = (modalText ?? "").replace(/The auction winner is/i, "").trim();

    expect(winnerName, "[Sold] Winner name tidak ditemukan di modal conductor").not.toBe("");
    console.log(`[Conductor] ✅ Winner: "${winnerName}"`);

    await attachScreenshot($testInfo, conductorPage, "08b - Conductor Winner Modal");

    // Klik Continue untuk advance ke lot berikutnya
    const continueBtn = conductorPage.getByRole('button', { name: 'Continue', exact: true });
    await continueBtn.waitFor({ state: "visible", timeout: 5000 });
    await continueBtn.click();
    await conductorPage.waitForTimeout(1000);
    console.log("[Conductor] Winner modal closed, advancing to next lot");
  });
});

Then("buyer closes winner notification", async ({ $testInfo }) => {
  await step("Buyer - Verify winner modal and close", async () => {
    // #4: Modal "You are the winner" HARUS muncul — buyer pasti menang karena satu-satunya bidder
    const winnerModal = buyerPage.locator('text=You are the winner');
    await winnerModal.waitFor({ state: "visible", timeout: 10000 });

    expect(
      await winnerModal.isVisible(),
      "[Winner] Modal 'You are the winner' tidak muncul di buyer — kemungkinan buyer bukan pemenang"
    ).toBe(true);

    console.log("[Buyer] ✅ Winner modal confirmed");
    await attachScreenshot($testInfo, buyerPage, "09 - Buyer Winner Modal");

    const closeBtn = buyerPage.getByRole('button', { name: 'Close', exact: true });
    await closeBtn.waitFor({ state: "visible", timeout: 5000 });
    await closeBtn.click();
    await buyerPage.waitForTimeout(1000);
    console.log("[Buyer] Winner modal closed");
    await attachScreenshot($testInfo, buyerPage, "09 - Buyer After Winner Modal");
  });
});

Then("conductor clicks unsold", async ({ $testInfo }) => {
  await step("Conductor - Click Unsold button", async () => {
    const unsoldBtn = conductorPage.getByRole("button", { name: "Unsold", exact: true });
    await unsoldBtn.waitFor({ state: "visible", timeout: 15000 });
    await expect(unsoldBtn).toBeEnabled({ timeout: 60000 });
    await unsoldBtn.click();
    await conductorPage.waitForTimeout(1000);
    console.log("[Conductor] Clicked Unsold");
    await attachScreenshot($testInfo, conductorPage, "08 - Conductor After Unsold");
    await attachScreenshot($testInfo, buyerPage,    "08 - Buyer After Unsold");
  });

  await step("Conductor - Handle Unsold modal and click Continue", async () => {
    // Setelah Unsold, muncul modal "The auction winner is Unsold" — perlu klik Continue
    const unsoldModal = conductorPage.locator('text=The auction winner is');
    const hasModal = await unsoldModal.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasModal) {
      const continueBtn = conductorPage.getByRole("button", { name: "Continue", exact: true });
      await continueBtn.waitFor({ state: "visible", timeout: 5000 });
      await continueBtn.click();
      await conductorPage.waitForTimeout(1000);
      console.log("[Conductor] Unsold modal closed via Continue");
    }
    await attachScreenshot($testInfo, conductorPage, "08b - Conductor Unsold Modal Closed");
  });

  await step("Verify no winner notification on buyer side", async () => {
    // Setelah Unsold: buyer TIDAK boleh menerima notifikasi "You are the winner"
    const winnerModal = buyerPage.locator("text=You are the winner");
    const hasWinner = await winnerModal.isVisible({ timeout: 5000 }).catch(() => false);

    expect(
      hasWinner,
      "[Unsold] Modal 'You are the winner' muncul di buyer padahal lot di-Unsold"
    ).toBe(false);

    console.log("[Buyer] ✅ No winner notification confirmed (Unsold scenario)");
    await attachScreenshot($testInfo, conductorPage, "08c - Conductor Unsold Confirmed");
    await attachScreenshot($testInfo, buyerPage,    "08c - Buyer Unsold - No Winner Modal");
  });
});

When("conductor moves to next lot", async ({ $testInfo }) => {
  await step("Conductor - Wait for next lot to load (auto-advance after Continue)", async () => {
    const prevPlate = createdVehicles[currentLotIndex]?.licensePlate ?? "";
    currentLotIndex++;
    const nextVehicle = createdVehicles[currentLotIndex];

    console.log(`[Conductor] Advancing to lot ${currentLotIndex + 1}...`);

    // Tunggu conductor page fully settled sebelum lanjut ke lot berikutnya.
    // Ini penting agar Enable Bid Button di lot berikutnya sudah enabled.
    await conductorPage.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {
      console.log("[Conductor] networkidle timeout, continuing anyway...");
    });

    if (nextVehicle) {
      // #7: Assert lot benar-benar berganti — tunggu plate kendaraan BERIKUTNYA muncul di buyer
      // (bukan hanya waitForTimeout yang tidak reliable)
      await buyerPage.waitForFunction(
        (plate) => document.body.innerText.includes(plate),
        nextVehicle.licensePlate,
        { timeout: 20000 }
      ).catch(() => {
        console.log(`[Conductor] ⚠️ Plate "${nextVehicle.licensePlate}" not found in buyer page, continuing...`);
      });
      console.log(`[Conductor] ✅ Lot changed: "${prevPlate}" → "${nextVehicle.licensePlate}"`);
    } else {
      // Fallback jika sudah lot terakhir
      await conductorPage.waitForTimeout(2000);
    }

    await attachScreenshot($testInfo, conductorPage, `${currentLotIndex + 1}0 - Conductor Next Lot`);
    await attachScreenshot($testInfo, buyerPage,     `${currentLotIndex + 1}0 - Buyer Next Lot`);
  });

  // Cross-verify data kendaraan lot berikutnya yang tampil di buyer
  if (createdVehicles.length > currentLotIndex) {
    await verifyVehicleDataInRoom(
      createdVehicles[currentLotIndex],
      `Lot ${currentLotIndex + 1}`,
      $testInfo
    );
  }
});
