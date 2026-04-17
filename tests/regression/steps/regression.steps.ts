import { createBdd } from "playwright-bdd";
import { expect, test } from "@playwright/test";
import { VehiclePage } from "../../../pages/VehiclePage";
import { AuctionPage } from "../../../pages/AuctionPage";
import { generateAuction } from "../../../helpers/random";

const { When } = createBdd();

// ── Shared State ──────────────────────────────────────────────────────────────
// Diisi saat vehicle dibuat, dipakai saat assign ke auction

const createdLicensePlates: string[] = [];
let createdAuctionName: string        = "";

// ── Helpers ───────────────────────────────────────────────────────────────────

function randDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

const REGRESSION_VEHICLES = [
  {
    // Lot 1 — Honda Brio: city car, AT, putih
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
    // Lot 2 — Toyota Yaris: hatchback, AT, hitam
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
    // Lot 3 — Toyota Hilux Revo: pickup, MT, silver, diesel 4WD
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
    // Lot 4 — BMW 120i: sedan premium, AT, biru, RWD
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
    // Lot 5 — Citroen C3: hatchback Eropa, AT, merah
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

async function addVehicle(page: any, preset: (typeof REGRESSION_VEHICLES)[number]) {
  const vehiclePage = new VehiclePage(page);
  const licensePlate = preset.licensePlate();

  const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
  await page.goto(`${baseUrl}/en/vehicle/car`);
  await page.locator('a[href*="/vehicle/car/create"]').waitFor({ state: "visible", timeout: 15000 });
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

  await vehiclePage.save();
  await expect(page).toHaveURL(/\/en\/vehicle\/car/, { timeout: 20000 });

  // Simpan license plate untuk dipakai di step assign vehicle ke auction
  createdLicensePlates.push(licensePlate);
}

// ── 1. Vehicle Steps (Backend) ────────────────────────────────────────────────

When("I add new vehicle 1 for testing", async ({ page }) => {
  test.setTimeout(600000); // 10 menit — cover 5 vehicle + auction creation + assign
  createdLicensePlates.length = 0; // reset tiap test run
  await addVehicle(page, REGRESSION_VEHICLES[0]);
});

When("I add new vehicle 2 for testing", async ({ page }) => {
  await addVehicle(page, REGRESSION_VEHICLES[1]);
});

When("I add new vehicle 3 for testing", async ({ page }) => {
  await addVehicle(page, REGRESSION_VEHICLES[2]);
});

When("I add new vehicle 4 for testing", async ({ page }) => {
  await addVehicle(page, REGRESSION_VEHICLES[3]);
});

When("I add new vehicle 5 for testing", async ({ page }) => {
  await addVehicle(page, REGRESSION_VEHICLES[4]);
});

// ── 2. Auction Session (Backend) ─────────────────────────────────────────────

When("I create a new auction session", async ({ page }) => {
  const auctionPage = new AuctionPage(page);
  const auctionData = generateAuction();
  createdAuctionName = auctionData.auctionName;

  const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
  await page.goto(`${baseUrl}/en/auction-management/auction`);
  await page.locator('a.btn-success:has-text("Create Auction Calendar")').waitFor({ state: "visible", timeout: 15000 });

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

  await auctionPage.save();
  await expect(page).toHaveURL(/\/en\/auction-management\/auction/, { timeout: 20000 });
  await page.waitForLoadState("domcontentloaded");
});

// ── 3. Assign Vehicles to Auction ─────────────────────────────────────────────

When("I assign the new vehicle to the auction session", async ({ page }) => {
  const auctionPage = new AuctionPage(page);

  // Navigasi ke detail auction yang baru dibuat
  await auctionPage.clickDetailByName(createdAuctionName);

  // Tambahkan 5 vehicle satu per satu (search by license plate → select → confirm)
  for (const lp of createdLicensePlates) {
    await auctionPage.clickAddCar();
    await auctionPage.searchVehicleInModal(lp);

    const hasVehicle = await auctionPage.page
      .locator('#tbl-vehicle-add input[name="inventory_car_id"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!hasVehicle) {
      // Vehicle tidak ditemukan di modal — close modal dan lanjut
      await auctionPage.page.keyboard.press("Escape");
      continue;
    }

    await auctionPage.selectFirstVehicleInModal();
    const result = await auctionPage.confirmAddVehicle();

    if (result === "already_existed") {
      console.log(`⚠️  Vehicle ${lp} already in an auction — skipped`);
    }
  }
});

// ── 4. Publish — TODO ─────────────────────────────────────────────────────────

// When("I publish the auction session", async ({ page }) => {
//   // TODO: Implement — publish sesi lelang
// });

// ── 4. Customer (FE Auction) — TODO ───────────────────────────────────────────

// When("I login with valid customer credentials", async ({ page }) => {
//   // TODO: Implement
//   // Gunakan: process.env.CUSTOMER_USER, process.env.CUSTOMER_PASS
// });

// Then("I should be ready to bid in the auction", async ({ page }) => {
//   // TODO: Implement
// });

// ── 4. Conductor (FE Conductor) — TODO ────────────────────────────────────────

// When("I login with valid conductor credentials", async ({ page }) => {
//   // TODO: Implement
//   // Gunakan: process.env.CONDUCTOR_USER, process.env.CONDUCTOR_PASS
// });

// Then("I should be ready to manage the auction", async ({ page }) => {
//   // TODO: Implement
// });

// ── 5. Auction Flow — TODO ────────────────────────────────────────────────────

// When("the conductor starts the auction for lot {int}", async ({ page }, _lot: number) => {});
// When("the customer places a bid on lot {int}", async ({ page }, _lot: number) => {});
// When("the conductor accepts the bid and moves to the next lot", async ({ page }) => {});
// When("the conductor ends the auction session", async ({ page }) => {});

// ── 6. Post-Auction Verification — TODO ──────────────────────────────────────

// Then("the auction status should be completed", async ({ page }) => {});
// Then("the transaction should be recorded in Backoffice", async ({ page }) => {});
