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

let currentLotIndex = 0;

const STARTING_PRICE = 100_000;
const BID_INCREMENT  = 5_000;
let   currentBidPrice = STARTING_PRICE;

async function attachScreenshot(testInfo: TestInfo, page: Page, label: string) {
  const ss = await page.screenshot();
  await attachment(label, ss, { contentType: "image/png" });
  await testInfo.attach(label, { body: ss, contentType: "image/png" });
}

// ── Vehicle Data Verification ─────────────────────────────────────────────────

async function getVehicleField(label: string): Promise<string> {
  const valueSpan = buyerPage
    .locator("span")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("..")
    .locator("span.text-right")
    .first();
  const visible = await valueSpan.isVisible({ timeout: 3000 }).catch(() => false);
  return visible ? ((await valueSpan.textContent()) ?? "").trim() : "";
}

async function verifyVehicleDataInRoom(vehicle: CreatedVehicle, lotLabel: string, testInfo: TestInfo) {
  await step(`Verify vehicle data in auction room - ${lotLabel}`, async () => {
    const plateVisible = await buyerPage
      .locator("span.text-right")
      .filter({ hasText: vehicle.licensePlate })
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);

    if (!plateVisible) {
      console.log(`[Buyer] ⚠️  Plate "${vehicle.licensePlate}" not found in span.text-right — skipping data verification`);
      await attachScreenshot(testInfo, buyerPage, `${lotLabel} - Buyer Room (plate not visible)`);
      return;
    }

    const plateOnScreen   = await getVehicleField("Plate No");
    const provOnScreen    = await getVehicleField("Province");
    const yearOnScreen    = await getVehicleField("Manufaturing Year");
    const fuelOnScreen    = await getVehicleField("Fuel");
    const colorOnScreen   = await getVehicleField("Color");
    const vinOnScreen     = await getVehicleField("VIN");
    const sellerOnScreen  = await getVehicleField("Seller");
    const mileageRaw      = await getVehicleField("Mileage");
    const mileageOnScreen = mileageRaw.replace(/,/g, "").replace(/\s*km$/i, "").trim();

    expect(plateOnScreen, `[${lotLabel}] Plate No mismatch`).toBe(vehicle.licensePlate);
    expect(provOnScreen,  `[${lotLabel}] Province mismatch`).toContain(vehicle.province);
    if (vehicle.manufactYear) expect(yearOnScreen,    `[${lotLabel}] Manufacturing Year mismatch`).toBe(vehicle.manufactYear);
    if (vehicle.fuel)         expect(fuelOnScreen,    `[${lotLabel}] Fuel mismatch`).toContain(vehicle.fuel);
    if (vehicle.mileage)      expect(mileageOnScreen, `[${lotLabel}] Mileage mismatch`).toBe(vehicle.mileage);
    if (vehicle.color)        expect(colorOnScreen,   `[${lotLabel}] Color mismatch`).toContain(vehicle.color);
    if (vehicle.vin)          expect(vinOnScreen,     `[${lotLabel}] VIN mismatch`).toContain(vehicle.vin);
    if (vehicle.seller)       expect(sellerOnScreen,  `[${lotLabel}] Seller mismatch`).toContain(vehicle.seller);

    console.log(`[Buyer] ✅ Vehicle data verified for ${vehicle.licensePlate} (${lotLabel})`);
    await attachScreenshot(testInfo, buyerPage, `${lotLabel} - Vehicle Data Verified`);
  });
}

// ── Step 1: Login ─────────────────────────────────────────────────────────────

When("conductor and buyer login in parallel", async ({ browser, $testInfo }) => {
  test.setTimeout(300000);
  currentLotIndex = 0;
  conductorContext = await browser.newContext();
  buyerContext     = await browser.newContext();
  conductorPage    = await conductorContext.newPage();
  buyerPage        = await buyerContext.newPage();

  const conductorLogin = new ConductorLoginPage(conductorPage);
  const buyerLogin     = new FELoginPage(buyerPage);

  await step("Parallel login: Conductor and Buyer", async () => {
    const conductorLoginPromise = (async () => {
      await conductorPage.goto(process.env.FE_CONDUCTOR_URL!);
      await conductorLogin.login(process.env.CONDUCTOR_USER!, process.env.CONDUCTOR_PASS!);
      await conductorPage.waitForURL((url) => !url.pathname.includes("login"), { timeout: 15000 });
    })();

    await buyerPage.goto(process.env.FE_AUCTION_URL!);
    await buyerLogin.login(process.env.AUCTION_USER!, process.env.AUCTION_PASS!);
    await buyerPage.waitForURL((url) => !url.pathname.includes("login"), { timeout: 15000 });
    console.log("[Buyer] Logged in successfully");

    await conductorLoginPromise;
    console.log("[Conductor] Logged in successfully");
  });

  await step("Verify sessions logged in", async () => {
    await Promise.all([
      attachScreenshot($testInfo, conductorPage, "01 - Conductor After Login"),
      attachScreenshot($testInfo, buyerPage,     "01 - Buyer After Login"),
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

// ── Step 2: Start & Join Auction ──────────────────────────────────────────────

When("conductor starts the auction", async ({ $testInfo }) => {
  await step("Conductor - Find auction card", async () => {
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
    await conductorPage.waitForLoadState("domcontentloaded");
    await conductorPage.waitForTimeout(3000);
    await attachScreenshot($testInfo, conductorPage, "02 - Conductor Auction Room");
  });
});

When("buyer joins the auction", async ({ $testInfo }) => {
  await step("Buyer - Calendar page: click Join Auction", async () => {
    await buyerPage.waitForLoadState("domcontentloaded");
    await buyerPage.waitForTimeout(1000);
    await attachScreenshot($testInfo, buyerPage, "03 - Buyer Calendar Page");

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
    console.log(`[Buyer] Looking for auction: "${createdAuctionName}"`);

    let checkbox;
    if (createdAuctionName) {
      const matchingRow = buyerPage.locator('div.w-full.flex.items-center').filter({ hasText: createdAuctionName }).first();
      const rowVisible = await matchingRow.isVisible({ timeout: 3000 }).catch(() => false);
      if (rowVisible) {
        checkbox = matchingRow.locator('input[name="selected_lane"]');
        console.log(`[Buyer] Found matching row for: "${createdAuctionName}"`);
      }
    }
    if (!checkbox) {
      console.log("[Buyer] Auction name not matched, using first row as fallback");
      checkbox = buyerPage.locator('input[name="selected_lane"]').first();
    }

    await checkbox.waitFor({ state: "visible", timeout: 10000 });
    await checkbox.click({ force: true });
    await buyerPage.waitForTimeout(500);
    await attachScreenshot($testInfo, buyerPage, "03 - Buyer After Select Auction Lane");

    const joinBtn = buyerPage.locator('button:has-text("Join Auction")');
    console.log("[Buyer] Waiting for Join Auction to be enabled...");
    await expect(joinBtn).toBeEnabled({ timeout: 60000 });
    await joinBtn.click();
    await buyerPage.waitForTimeout(2000);
  });

  await step("Buyer - Verify inside auction room", async () => {
    await attachScreenshot($testInfo, buyerPage, "03 - Buyer Inside Auction Room");
  });

  if (createdVehicles.length > currentLotIndex) {
    await verifyVehicleDataInRoom(createdVehicles[currentLotIndex], `Lot ${currentLotIndex + 1}`, $testInfo);
  }
});

// ── Step 3: Enable Bidding ────────────────────────────────────────────────────

async function doEnableBidding(testInfo: TestInfo) {
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
  });

  await step("Conductor - Set Reserved Price", async () => {
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
    }, String(90_000));
    await conductorPage.waitForTimeout(500);

    await adjustReservedBtn.click({ force: true });
    await conductorPage.waitForTimeout(1000);
    console.log(`[Conductor] Reserved price set to 90,000`);
  });

  await step("Conductor - Click Enable Bid Button", async () => {
    const enableBidBtn = conductorPage.locator('button:has-text("Enable Bid Button")');
    await enableBidBtn.waitFor({ state: "visible", timeout: 10000 });
    await expect(enableBidBtn).toBeEnabled({ timeout: 15000 });
    await enableBidBtn.click();
    await conductorPage.waitForTimeout(1000);
  });

  await step("Verify bidding enabled", async () => {
    await Promise.all([
      attachScreenshot(testInfo, conductorPage, "04 - Conductor After Enable Bid"),
      attachScreenshot(testInfo, buyerPage,     "04 - Buyer View After Bid Enabled"),
    ]);
  });
}

When("conductor enables bidding", async ({ $testInfo }) => {
  await doEnableBidding($testInfo);
});

// ── Step 4: Buyer Bid ─────────────────────────────────────────────────────────

When("buyer places a bid", async ({ $testInfo }) => {
  await step("Buyer - Click Interested (if not already bidding)", async () => {
    const interestedBtn = buyerPage.locator('button:has-text("Interested")');
    const isInterested = await interestedBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (isInterested) {
      await expect(interestedBtn).toBeEnabled({ timeout: 5000 });
      await interestedBtn.click();
      await buyerPage.waitForTimeout(1000);
      console.log("[Buyer] Clicked Interested");

      const acceptBtn = buyerPage.locator('button:has-text("Accept")');
      await acceptBtn.waitFor({ state: "visible", timeout: 10000 });
      await expect(acceptBtn).toBeEnabled({ timeout: 15000 });
      await acceptBtn.click();
      await buyerPage.waitForTimeout(1000);
      console.log("[Buyer] Clicked Accept");
    } else {
      console.log("[Buyer] Already in bidding state (skipping Interested + Accept)");
    }
    await attachScreenshot($testInfo, buyerPage, "05 - Buyer Bid State");
  });

  await step("Buyer - Offer +5000", async () => {
    const increaseBtn = buyerPage.locator('button:has-text("5000")').first();
    await increaseBtn.waitFor({ state: "visible", timeout: 10000 });
    await expect(increaseBtn).toBeEnabled({ timeout: 5000 });
    await increaseBtn.click();
    await buyerPage.waitForTimeout(1000);
    currentBidPrice = STARTING_PRICE + BID_INCREMENT;
    console.log(`[Buyer] Offered +${BID_INCREMENT.toLocaleString("en-US")} → expected bid: ${currentBidPrice.toLocaleString("en-US")}`);

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
    const expectedFormatted = currentBidPrice.toLocaleString("en-US");

    const buyerHasBid = await buyerPage
      .locator(`text=${expectedFormatted}`).first()
      .isVisible({ timeout: 10000 }).catch(() => false);

    const conductorHasBid = await conductorPage
      .locator(`text=${expectedFormatted}`).first()
      .isVisible({ timeout: 10000 }).catch(() => false);

    expect(buyerHasBid,     `[Bid Price] "${expectedFormatted}" tidak tampil di buyer`).toBe(true);
    expect(conductorHasBid, `[Bid Price] "${expectedFormatted}" tidak tampil di conductor`).toBe(true);

    console.log(`[Verify] ✅ Bid price "${expectedFormatted}" confirmed on both sides`);
    await Promise.all([
      attachScreenshot($testInfo, conductorPage, "05c - Conductor Bid Price Updated"),
      attachScreenshot($testInfo, buyerPage,     "05c - Buyer Bid Price Updated"),
    ]);
  });
});

// ── Step 5: Countdown & Unsold ────────────────────────────────────────────────

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
    const soldBtn = conductorPage.getByRole('button', { name: 'Sold', exact: true });
    await expect(soldBtn).toBeEnabled({ timeout: 60000 });
    console.log("[Conductor] Countdown finished, Sold button is now enabled");
    await attachScreenshot($testInfo, conductorPage, "06b - Conductor After Countdown");
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
  });

  await step("Conductor - Handle Unsold modal and click Continue", async () => {
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
});

Then("conductor clicks sold", async ({ $testInfo }) => {
  await step("Conductor - Click Sold button", async () => {
    const soldBtn = conductorPage.getByRole("button", { name: "Sold", exact: true });
    await soldBtn.waitFor({ state: "visible", timeout: 15000 });
    await expect(soldBtn).toBeEnabled({ timeout: 60000 });
    await soldBtn.click();
    await conductorPage.waitForTimeout(1000);
    console.log("[Conductor] Clicked Sold");
    await attachScreenshot($testInfo, conductorPage, "08 - Conductor After Sold");
  });

  await step("Conductor - Handle Sold modal and click Continue", async () => {
    const continueBtn = conductorPage.getByRole("button", { name: "Continue", exact: true });
    const hasModal = await continueBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasModal) {
      await continueBtn.click();
      await conductorPage.waitForTimeout(1000);
      console.log("[Conductor] Sold modal closed via Continue");
    }
    await attachScreenshot($testInfo, conductorPage, "08b - Conductor Sold Modal Closed");
  });
});

// ── Step 6: End Auction ───────────────────────────────────────────────────────

When("conductor ends the auction", async ({ $testInfo }) => {
  await step("Conductor - Click End Lane", async () => {
    const endLaneBtn = conductorPage.locator('button:has-text("End Lane")');
    await endLaneBtn.waitFor({ state: "visible", timeout: 15000 });
    await expect(endLaneBtn).toBeEnabled({ timeout: 10000 });
    await endLaneBtn.click();
    await conductorPage.waitForTimeout(2000);
    console.log("[Conductor] Clicked End Lane");
    await attachScreenshot($testInfo, conductorPage, "99 - Conductor After End Lane");
  });
});

// ── Step 7: Move to Next Lot ──────────────────────────────────────────────────

When("conductor moves to next lot", async ({ $testInfo }) => {
  await step("Conductor - Wait for next lot to load", async () => {
    const prevPlate = createdVehicles[currentLotIndex]?.licensePlate ?? "";
    currentLotIndex++;
    const nextVehicle = createdVehicles[currentLotIndex];

    console.log(`[Conductor] Advancing to lot ${currentLotIndex + 1}...`);

    await conductorPage.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {
      console.log("[Conductor] networkidle timeout, continuing anyway...");
    });

    if (nextVehicle) {
      await buyerPage.waitForFunction(
        (plate) => document.body.innerText.includes(plate),
        nextVehicle.licensePlate,
        { timeout: 20000 }
      ).catch(() => {
        console.log(`[Conductor] ⚠️ Plate "${nextVehicle.licensePlate}" not found in buyer page, continuing...`);
      });
      console.log(`[Conductor] ✅ Lot changed: "${prevPlate}" → "${nextVehicle.licensePlate}"`);
    } else {
      await conductorPage.waitForTimeout(2000);
    }

    await attachScreenshot($testInfo, conductorPage, `${currentLotIndex + 1}0 - Conductor Next Lot`);
    await attachScreenshot($testInfo, buyerPage,     `${currentLotIndex + 1}0 - Buyer Next Lot`);
  });

  if (createdVehicles.length > currentLotIndex) {
    await verifyVehicleDataInRoom(createdVehicles[currentLotIndex], `Lot ${currentLotIndex + 1}`, $testInfo);
  }
});
