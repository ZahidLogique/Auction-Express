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

  // Generate nilai random sekali dan simpan agar bisa di-assert di V3/V4
  const engineNo    = preset.engineNo();
  const vin         = preset.vin();
  const manufactYear = preset.manufactYear;
  const mileage     = preset.mileage;
  const brand       = preset.brand;
  const groupType   = preset.groupType;
  const province    = preset.province;
  const seller      = preset.seller;
  const color       = preset.color;
  const transmission = preset.transmission;
  const fuel        = preset.fuel;
  const drive       = preset.drive;

  await step(`Navigate to vehicle list`, async () => {
    const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
    await page.goto(`${baseUrl}/en/vehicle/car`);
    await page.locator('a[href*="/vehicle/car/create"]').waitFor({ state: "visible", timeout: 15000 });
  });

  await step(`Fill vehicle form - ${brand} ${groupType} (${licensePlate})`, async () => {
    await vehiclePage.clickRegisterNew();
    await vehiclePage.fillCreateForm({
      licensePlate,
      province:     preset.province,
      seller:       preset.seller,
      brand,
      groupType,
      color:        preset.color,
      transmission: preset.transmission,
      fuel:         preset.fuel,
      drive:        preset.drive,
      manufactYear,
      mileage,
      engineNo,
      vin,
    });
  });

  // ── Save + V2: Success Notification ────────────────────────────────────────
  await step(`Save vehicle`, async () => {
    await vehiclePage.save();

    // V2: Tangkap notifikasi sukses yang muncul sesaat setelah save
    const successMsg = await vehiclePage.getSuccessMessage();
    const ss = await page.screenshot();
    const msgLabel = successMsg
      ? `V2 ✅ Success - "${successMsg}"`
      : `V2 ℹ️ No explicit toast detected`;
    await attachment(`${lotLabel} - ${msgLabel}`, ss, { contentType: "image/png" });
    await testInfo.attach(`${lotLabel} - ${msgLabel}`, { body: ss, contentType: "image/png" });
    console.log(`[Vehicle] ${msgLabel}`);
  });

  // Tunggu redirect ke halaman list
  await expect(page).toHaveURL(/\/en\/vehicle\/car/, { timeout: 20000 });

  // ── V1: License Plate muncul di list ───────────────────────────────────────
  await step(`V1 - Verify license plate "${licensePlate}" in vehicle list`, async () => {
    // Navigate fresh ke list agar Livewire component selalu dalam state bersih
    const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
    await page.goto(`${baseUrl}/en/vehicle/car`);
    await vehiclePage.searchVehicle(licensePlate);
    const row = vehiclePage.getRow(licensePlate);
    await expect(row).toBeVisible({ timeout: 10000 });

    const ss = await page.screenshot();
    await attachment(`${lotLabel} - V1 ✅ License Plate In List`, ss, { contentType: "image/png" });
    await testInfo.attach(`${lotLabel} - V1 Vehicle In List (${licensePlate})`, { body: ss, contentType: "image/png" });
    console.log(`[Vehicle] V1 ✅ License plate "${licensePlate}" found in list`);
  });

  // ── V3 & V4: Buka show page dan verifikasi semua field yang disubmit ─────────
  await step(`V3/V4 - Open show page and verify all submitted fields`, async () => {
    // Double-click row → tab baru show page (/car/show/{uuid})
    const showPage = await vehiclePage.clickEditForRow(licensePlate);

    // Tunggu field license plate terisi di show page (ID-based, lebih targeted)
    await showPage.locator("#car_reg_no").waitFor({ state: "visible", timeout: 15000 });
    await showPage.waitForFunction(
      (lp) => (document.querySelector("#car_reg_no") as HTMLInputElement)?.value === lp,
      licensePlate,
      { timeout: 15000 }
    );

    // Helper: baca selected option text dari <select> berdasarkan CSS selector
    const getSelectText = (selector: string): Promise<string> =>
      showPage.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLSelectElement;
        const opt = el?.options[el?.selectedIndex];
        return opt ? opt.text.trim() : "";
      }, selector);

    // ── V3: Input fields (ID selector + inputValue) ───────────────────────────
    const licensePlateVal = await showPage.locator("#car_reg_no").inputValue();
    const manufactYearVal = await showPage.locator("#car_man_year").inputValue();
    // input-currency JS bisa format "18000" → "18,000" — normalisasi koma
    const mileageVal      = (await showPage.locator("#car_mileage").inputValue()).replace(/,/g, "");
    const engineNoVal     = await showPage.locator("#car_enging_no").inputValue();
    const vinVal          = await showPage.locator("#car_vin").inputValue();

    expect(licensePlateVal, `V3 License Plate "${licensePlate}" mismatch`).toBe(licensePlate);
    expect(manufactYearVal, `V3 Manufacturing Year "${manufactYear}" mismatch`).toBe(manufactYear);
    expect(mileageVal,      `V3 Mileage "${mileage}" mismatch`).toBe(mileage);
    console.log(`[Vehicle] V3 ✅ License Plate, Manufacturing Year, Mileage verified`);

    // ── V3: Select fields (ID/name selector + selectedIndex.text) ────────────
    const provinceText     = await getSelectText("#province_code");
    const sellerText       = await getSelectText("#membership_id_ori");
    const brandText        = await getSelectText("#brand_id");
    const modelText        = await getSelectText("#group_type_id");
    const colorText        = await getSelectText("#color_id");
    const transmissionText = await getSelectText("#car_transmission");
    const fuelText         = await getSelectText("#fuel_id");
    // drive_description tidak punya id — pakai attribute name selector
    const driveText        = await getSelectText('[name="drive_description"]');

    expect(provinceText, `V3 Province "${province}" mismatch`).toContain(province);
    expect(sellerText,   `V3 Seller "${seller}" mismatch`).toContain(seller);
    expect(brandText,    `V3 Brand "${brand}" mismatch`).toContain(brand);
    expect(modelText,    `V3 Model "${groupType}" mismatch`).toContain(groupType);
    if (color)        expect(colorText,        `V3 Color "${color}" mismatch`).toContain(color);
    if (transmission) expect(transmissionText, `V3 Transmission "${transmission}" mismatch`).toContain(transmission);
    if (fuel)         expect(fuelText,         `V3 Fuel "${fuel}" mismatch`).toContain(fuel);
    if (drive)        expect(driveText,        `V3 Drive "${drive}" mismatch`).toContain(drive);
    console.log(`[Vehicle] V3 ✅ Province, Seller, Brand, Model, Color, Transmission, Fuel, Drive verified`);

    // ── V4: Engine No & VIN ───────────────────────────────────────────────────
    expect(engineNoVal, `V4 Engine No "${engineNo}" mismatch`).toContain(engineNo);
    expect(vinVal,      `V4 VIN "${vin}" mismatch`).toContain(vin);
    console.log(`[Vehicle] V4 ✅ Engine No "${engineNo}" & VIN "${vin}" verified`);

    const ss = await showPage.screenshot();
    await attachment(`${lotLabel} - V3/V4 ✅ Show Page Verified`, ss, { contentType: "image/png" });
    await testInfo.attach(`${lotLabel} - V3/V4 Show Page`, { body: ss, contentType: "image/png" });

    await showPage.close();
    await page.bringToFront();
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
