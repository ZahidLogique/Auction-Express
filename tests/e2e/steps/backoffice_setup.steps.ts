import { createBdd } from "playwright-bdd";
import { expect, test } from "../../../fixtures/base";
import { saveState } from "../../../fixtures/test-state";
import { step } from "allure-js-commons";
import { AuctionPage } from "../../../pages/backoffice/AuctionPage";
import { generateAuction } from "../../../helpers/random";
import { appears } from "../../../helpers/wait";
import { attachStepScreenshot } from "../../../helpers/screenshot";

const { When } = createBdd(test);

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
let createdAuctionName: string                 = "";

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
  saveState({ auctionName: createdAuctionName });

  await step("Navigate to auction list", async () => {
    const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
    await gotoWithRetry(page, `${baseUrl}/en/auction-management/auction`);
    await page.locator('a.btn-success[href*="create"]').waitFor({ state: "visible", timeout: 15000 });

    await attachStepScreenshot($testInfo, page, "01 - Auction List Before Create");
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

    await attachStepScreenshot($testInfo, page, `02 - Auction Created (${createdAuctionName})`);
  });
});

// ── 2. Assign Vehicles ────────────────────────────────────────────────────────

When("I assign the vehicles to the auction session", async ({ page, $testInfo }) => {
  const auctionPage = new AuctionPage(page);
  const skippedPlates: string[] = [];

  await step(`Open auction detail - ${createdAuctionName}`, async () => {
    const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
    await page.goto(`${baseUrl}/en/auction-management/auction`);
    await page.waitForLoadState("domcontentloaded");
    await page.locator("#jadwallelang tbody").waitFor({ state: "visible", timeout: 15000 });
    await auctionPage.searchAuction(createdAuctionName);
    await auctionPage.clickDetailByName(createdAuctionName);

    await attachStepScreenshot($testInfo, page, "03 - Auction Detail Before Assign");
  });

  for (const lp of createdLicensePlates) {
    await step(`Assign vehicle ${lp} to auction`, async () => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        await auctionPage.clickAddCar();
        await auctionPage.searchVehicleInModal(lp);

        const hasVehicle = await auctionPage.page
          .locator('#tbl-vehicle-add input.add-vehicle-checkbox')
          .first()
          .waitFor({ state: "visible", timeout: 25000 })
          .then(() => true)
          .catch(() => false);

        if (!hasVehicle) {
          await auctionPage.page.keyboard.press("Escape");
          console.log(`⚠️  Vehicle ${lp} not found in modal (attempt ${attempt}/3)`);
          continue;
        }

        await auctionPage.selectFirstVehicleInModal();
        const result = await auctionPage.confirmAddVehicle();
        if (result === "added") {
          // Pastikan benar-benar masuk: plat harus tampil di tabel Vehicle detail auction
          const inList = await appears(auctionPage.page.locator("tr").filter({ hasText: lp }), 10000);
          if (inList) return;
          console.log(`⚠️  Vehicle ${lp} tidak muncul di daftar auction (attempt ${attempt}/3)`);
          continue;
        }

        if (result === "already_existed") {
          console.log(`⚠️  Vehicle ${lp} already in an auction — skipped`);
          break;
        }
        console.log(`⚠️  Vehicle ${lp} tidak ter-pilih di modal (attempt ${attempt}/3)`);
      }
      skippedPlates.push(lp);
    });
  }

  await step("Verify all vehicles assigned", async () => {
    if (skippedPlates.length > 0) {
      throw new Error(`Vehicle tidak ter-assign (${skippedPlates.length}/${createdLicensePlates.length}): ${skippedPlates.join(", ")}`);
    }

    await attachStepScreenshot($testInfo, page, "04 - Auction Detail After Assign All Vehicles");
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

    await attachStepScreenshot($testInfo, page, "05 - Auction List Before Publish");
  });

  await step(`Publish auction - ${createdAuctionName}`, async () => {
    await auctionPage.publishAuction(createdAuctionName);

    await attachStepScreenshot($testInfo, page, "06 - Auction Published");
  });
});
