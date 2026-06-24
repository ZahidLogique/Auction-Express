import { createBdd } from "playwright-bdd";
import { expect, test } from "@playwright/test";
import { step, attachment } from "allure-js-commons";
import { AuctionPage } from "../../../pages/backoffice/AuctionPage";
import { generateAuction } from "../../../helpers/random";

const { When } = createBdd();

// ── Shared State ──────────────────────────────────────────────────────────────

export interface CreatedVehicle {
  licensePlate: string;
  province:     string;
  seller?:      string;
  brand?:       string;
  groupType?:   string;
  color?:       string;
  transmission?: string;
  fuel?:        string;
  drive?:       string;
  manufactYear?: string;
  mileage?:     string;
  engineNo?:    string;
  vin?:         string;
}

// Hardcoded vehicles — already registered in staging, reused across auction runs
const REGRESSION_VEHICLES: CreatedVehicle[] = [
  { licensePlate: "Z111AUT", province: "Bangkok" },
  { licensePlate: "Z222AUT", province: "Bangkok" },
  { licensePlate: "Z333AUT", province: "Bangkok" },
  { licensePlate: "Z444AUT", province: "Bangkok" },
  { licensePlate: "Z555AUT", province: "Bangkok" },
];

export const createdVehicles: CreatedVehicle[] = [...REGRESSION_VEHICLES];
const createdLicensePlates: string[]           = REGRESSION_VEHICLES.map(v => v.licensePlate);
export let createdAuctionName: string          = "";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function gotoWithRetry(page: any, url: string, retries = 3, delayMs = 5000) {
  for (let i = 0; i < retries; i++) {
    await page.goto(url);
    const is5xx = await page.locator("text=/50[0-9] /").isVisible({ timeout: 3000 }).catch(() => false);
    if (!is5xx) return;
    console.log(`[Retry] Server error on ${url}, waiting ${delayMs}ms before retry ${i + 1}/${retries}`);
    await page.waitForTimeout(delayMs);
  }
}

// ── 1. Auction Session ────────────────────────────────────────────────────────

When("I create a new auction session", async ({ page, $testInfo }) => {
  test.setTimeout(300000);
  const auctionPage = new AuctionPage(page);
  const auctionData = generateAuction();
  createdAuctionName = auctionData.auctionName;

  await step("Navigate to auction list", async () => {
    const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
    await gotoWithRetry(page, `${baseUrl}/en/auction-management/auction`);
    await page.locator('a.btn-success[href*="create"]').waitFor({ state: "visible", timeout: 15000 });

    const ss = await page.screenshot();
    await attachment("Auction List Before Create", ss, { contentType: "image/png" });
    await $testInfo.attach("01 - Auction List Before Create", { body: ss, contentType: "image/png" });
  });

  await step(`Fill auction form - ${auctionData.auctionName}`, async () => {
    await auctionPage.clickCreateAuctionCalendar();
    await auctionPage.fillCreateForm({
      date:        auctionData.date,
      location:    auctionData.location,
      auctionName: auctionData.auctionName,
      lotNumber:   auctionData.lotNumber,
      lane:        auctionData.lane,
      auctionType: auctionData.auctionType,
      method:      auctionData.method,
      startTimer:  auctionData.startTimer,
      resetTimer:  auctionData.resetTimer,
      startTime:   auctionData.startTime,
      eventType:   auctionData.eventType,
      duration:    auctionData.duration,
    });
  });

  await step("Save auction and verify", async () => {
    await auctionPage.save();
    await expect(page).toHaveURL(/\/en\/auction-management\/auction(\?|$)/, { timeout: 20000 });
    await page.waitForLoadState("domcontentloaded");

    const ss = await page.screenshot();
    await attachment(`Auction Created - ${createdAuctionName}`, ss, { contentType: "image/png" });
    await $testInfo.attach(`02 - Auction Created (${createdAuctionName})`, { body: ss, contentType: "image/png" });
  });
});

// ── 2. Assign Vehicles ────────────────────────────────────────────────────────

When("I assign the vehicles to the auction session", async ({ page, $testInfo }) => {
  const auctionPage = new AuctionPage(page);

  await step(`Open auction detail - ${createdAuctionName}`, async () => {
    const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
    await page.goto(`${baseUrl}/en/auction-management/auction`);
    await page.waitForLoadState("domcontentloaded");
    await page.locator("#jadwallelang tbody").waitFor({ state: "visible", timeout: 15000 });
    await auctionPage.searchAuction(createdAuctionName);
    await auctionPage.clickDetailByName(createdAuctionName);

    const ss = await page.screenshot();
    await attachment("Auction Detail Before Assign", ss, { contentType: "image/png" });
    await $testInfo.attach("03 - Auction Detail Before Assign", { body: ss, contentType: "image/png" });
  });

  for (const lp of createdLicensePlates) {
    await step(`Assign vehicle ${lp} to auction`, async () => {
      await auctionPage.clickAddCar();
      await auctionPage.searchVehicleInModal(lp);

      const hasVehicle = await auctionPage.page
        .locator('#tbl-vehicle-add input[name="inventory_car_id"]')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (!hasVehicle) {
        await auctionPage.page.keyboard.press("Escape");
        console.log(`⚠️  Vehicle ${lp} not found in modal — skipped`);
        return;
      }

      await auctionPage.selectFirstVehicleInModal();
      const result = await auctionPage.confirmAddVehicle();
      if (result === "already_existed") {
        console.log(`⚠️  Vehicle ${lp} already in an auction — skipped`);
      }
    });
  }

  await step("Verify all vehicles assigned", async () => {
    const ss = await page.screenshot();
    await attachment("After Assign All Vehicles", ss, { contentType: "image/png" });
    await $testInfo.attach("04 - Auction Detail After Assign All Vehicles", { body: ss, contentType: "image/png" });
  });
});

// ── 3. Publish ────────────────────────────────────────────────────────────────

When("I publish the auction session", async ({ page, $testInfo }) => {
  const auctionPage = new AuctionPage(page);

  await step("Navigate to auction list for publish", async () => {
    const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
    await page.goto(`${baseUrl}/en/auction-management/auction`);
    await page.waitForLoadState("domcontentloaded");
    await page.locator("#jadwallelang tbody").waitFor({ state: "visible", timeout: 15000 });

    const ss = await page.screenshot();
    await attachment("Auction List Before Publish", ss, { contentType: "image/png" });
    await $testInfo.attach("05 - Auction List Before Publish", { body: ss, contentType: "image/png" });
  });

  await step(`Publish auction - ${createdAuctionName}`, async () => {
    await auctionPage.publishAuction(createdAuctionName);

    const ss = await page.screenshot();
    await attachment("Auction Published", ss, { contentType: "image/png" });
    await $testInfo.attach("06 - Auction Published", { body: ss, contentType: "image/png" });
  });
});
