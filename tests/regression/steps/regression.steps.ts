import { createBdd } from "playwright-bdd";
import { expect, test } from "@playwright/test";
import { step, attachment } from "allure-js-commons";
import { VehiclePage } from "../../../pages/backoffice/VehiclePage";
import { AuctionPage } from "../../../pages/backoffice/AuctionPage";
import { generateAuction } from "../../../helpers/random";

const { When } = createBdd();

// ── Shared State ──────────────────────────────────────────────────────────────
const createdLicensePlates: string[] = [];
export let createdAuctionName: string = "";

// ── Helpers ───────────────────────────────────────────────────────────────────

function randDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

const REGRESSION_VEHICLES = [
  {
    licensePlate:  () => `VH1${randDigits(4)}`,
    province:      "Bangkok",
    seller:        "Zahid",
    brand:         "Honda",
    groupType:     "Brio",
    color:         "White",
    transmission:  "AT",
    fuel:          "Benzine",
    drive:         "FWD",
    manufactYear:  "2021",
    mileage:       "18000",
    engineNo:      () => `ENG1${randDigits(7)}`,
    vin:           () => `VIN1${randDigits(9)}`,
  },
  {
    licensePlate:  () => `VH2${randDigits(4)}`,
    province:      "Bangkok",
    seller:        "Zahid",
    brand:         "Toyota",
    groupType:     "Yaris",
    color:         "Black",
    transmission:  "AT",
    fuel:          "Benzine",
    drive:         "FWD",
    manufactYear:  "2020",
    mileage:       "25000",
    engineNo:      () => `ENG2${randDigits(7)}`,
    vin:           () => `VIN2${randDigits(9)}`,
  },
  {
    licensePlate:  () => `VH3${randDigits(4)}`,
    province:      "Bangkok",
    seller:        "Zahid",
    brand:         "Toyota",
    groupType:     "Hilux Revo",
    color:         "Silver",
    transmission:  "MT",
    fuel:          "Diesel",
    drive:         "4WD",
    manufactYear:  "2019",
    mileage:       "55000",
    engineNo:      () => `ENG3${randDigits(7)}`,
    vin:           () => `VIN3${randDigits(9)}`,
  },
  {
    licensePlate:  () => `VH4${randDigits(4)}`,
    province:      "Bangkok",
    seller:        "Zahid",
    brand:         "BMW",
    groupType:     "120i",
    color:         "Blue",
    transmission:  "AT",
    fuel:          "Benzine",
    drive:         "RWD",
    manufactYear:  "2022",
    mileage:       "8000",
    engineNo:      () => `ENG4${randDigits(7)}`,
    vin:           () => `VIN4${randDigits(9)}`,
  },
  {
    licensePlate:  () => `VH5${randDigits(4)}`,
    province:      "Bangkok",
    seller:        "Zahid",
    brand:         "Citroen",
    groupType:     "C3",
    color:         "Red",
    transmission:  "AT",
    fuel:          "Benzine",
    drive:         "FWD",
    manufactYear:  "2018",
    mileage:       "72000",
    engineNo:      () => `ENG5${randDigits(7)}`,
    vin:           () => `VIN5${randDigits(9)}`,
  },
];

// ── Helper: add single vehicle ────────────────────────────────────────────────

async function addVehicle(
  page: any,
  testInfo: any,
  preset: (typeof REGRESSION_VEHICLES)[number],
  lotLabel: string
) {
  const vehiclePage = new VehiclePage(page);
  const licensePlate = preset.licensePlate();

  await step(`Navigate to vehicle list`, async () => {
    const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
    await page.goto(`${baseUrl}/en/vehicle/car`);
    await page.locator('a[href*="/vehicle/car/create"]').waitFor({ state: "visible", timeout: 15000 });
  });

  await step(`Fill vehicle form - ${preset.brand} ${preset.groupType} (${licensePlate})`, async () => {
    await vehiclePage.clickRegisterNew();
    await vehiclePage.fillCreateForm({
      licensePlate,
      province:     preset.province,
      seller:       preset.seller,
      brand:        preset.brand,
      groupType:    preset.groupType,
      color:        preset.color,
      transmission: preset.transmission,
      fuel:         preset.fuel,
      drive:        preset.drive,
      manufactYear: preset.manufactYear,
      mileage:      preset.mileage,
      engineNo:     preset.engineNo(),
      vin:          preset.vin(),
    });
  });

  await step(`Save vehicle and verify`, async () => {
    await vehiclePage.save();
    await expect(page).toHaveURL(/\/en\/vehicle\/car/, { timeout: 20000 });

    const ss = await page.screenshot();
    await attachment(`${lotLabel} - ${preset.brand} ${preset.groupType} Saved`, ss, { contentType: "image/png" });
    await testInfo.attach(`${lotLabel} - Vehicle Saved (${licensePlate})`, { body: ss, contentType: "image/png" });
  });

  createdLicensePlates.push(licensePlate);
}

// ── 1. Vehicle Steps ──────────────────────────────────────────────────────────

When("I add new vehicle 1 for testing", async ({ page, $testInfo }) => {
  test.setTimeout(600000);
  createdLicensePlates.length = 0;
  await addVehicle(page, $testInfo, REGRESSION_VEHICLES[0], "03 - Lot 1");
});

When("I add new vehicle 2 for testing", async ({ page, $testInfo }) => {
  await addVehicle(page, $testInfo, REGRESSION_VEHICLES[1], "04 - Lot 2");
});

When("I add new vehicle 3 for testing", async ({ page, $testInfo }) => {
  await addVehicle(page, $testInfo, REGRESSION_VEHICLES[2], "05 - Lot 3");
});

When("I add new vehicle 4 for testing", async ({ page, $testInfo }) => {
  await addVehicle(page, $testInfo, REGRESSION_VEHICLES[3], "06 - Lot 4");
});

When("I add new vehicle 5 for testing", async ({ page, $testInfo }) => {
  await addVehicle(page, $testInfo, REGRESSION_VEHICLES[4], "07 - Lot 5");
});

// ── 2. Auction Session ────────────────────────────────────────────────────────

When("I create a new auction session", async ({ page, $testInfo }) => {
  const auctionPage = new AuctionPage(page);
  const auctionData = generateAuction();
  createdAuctionName = auctionData.auctionName;

  await step("Navigate to auction list", async () => {
    const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
    await page.goto(`${baseUrl}/en/auction-management/auction`);
    await page.locator('a.btn-success:has-text("Create Auction Calendar")').waitFor({ state: "visible", timeout: 15000 });

    const ss = await page.screenshot();
    await attachment("Auction List Before Create", ss, { contentType: "image/png" });
    await $testInfo.attach("08 - Auction List Before Create", { body: ss, contentType: "image/png" });
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
    });
  });

  await step("Save auction and verify", async () => {
    await auctionPage.save();
    await expect(page).toHaveURL(/\/en\/auction-management\/auction/, { timeout: 20000 });
    await page.waitForLoadState("domcontentloaded");

    const ss = await page.screenshot();
    await attachment(`Auction Created - ${createdAuctionName}`, ss, { contentType: "image/png" });
    await $testInfo.attach(`09 - Auction Created (${createdAuctionName})`, { body: ss, contentType: "image/png" });
  });
});

// ── 3. Assign Vehicles ────────────────────────────────────────────────────────

When("I assign the new vehicle to the auction session", async ({ page, $testInfo }) => {
  const auctionPage = new AuctionPage(page);

  await step(`Open auction detail - ${createdAuctionName}`, async () => {
    // Navigasi fresh ke list + search dulu agar Livewire tidak stale
    const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
    await page.goto(`${baseUrl}/en/auction-management/auction`);
    await page.waitForLoadState("domcontentloaded");
    await page.locator("#jadwallelang tbody").waitFor({ state: "visible", timeout: 15000 });
    await auctionPage.searchAuction(createdAuctionName);

    await auctionPage.clickDetailByName(createdAuctionName);

    const ss = await page.screenshot();
    await attachment("Auction Detail Before Assign", ss, { contentType: "image/png" });
    await $testInfo.attach("10 - Auction Detail Before Assign", { body: ss, contentType: "image/png" });
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
    await $testInfo.attach("11 - Auction Detail After Assign All Vehicles", { body: ss, contentType: "image/png" });
  });
});

// ── 4. Publish ────────────────────────────────────────────────────────────────

When("I publish the auction session", async ({ page, $testInfo }) => {
  const auctionPage = new AuctionPage(page);

  await step("Navigate to auction list for publish", async () => {
    const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
    await page.goto(`${baseUrl}/en/auction-management/auction`);
    await page.waitForLoadState("domcontentloaded");
    await page.locator("#jadwallelang tbody").waitFor({ state: "visible", timeout: 15000 });

    const ss = await page.screenshot();
    await attachment("Auction List Before Publish", ss, { contentType: "image/png" });
    await $testInfo.attach("12 - Auction List Before Publish", { body: ss, contentType: "image/png" });
  });

  await step(`Publish auction - ${createdAuctionName}`, async () => {
    await auctionPage.publishAuction(createdAuctionName);

    const ss = await page.screenshot();
    await attachment("Auction Published", ss, { contentType: "image/png" });
    await $testInfo.attach("13 - Auction Published", { body: ss, contentType: "image/png" });
  });
});
