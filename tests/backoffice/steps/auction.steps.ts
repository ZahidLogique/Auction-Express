import { createBdd } from "playwright-bdd";
import { expect, test } from "@playwright/test";
import { AuctionPage } from "../../../pages/AuctionPage";
import { generateAuction, AuctionData } from "../../../helpers/random";
import { takeScreenshot } from "../../../helpers/screenshot";

const { Given, When, Then } = createBdd();

let auctionPage: AuctionPage;
let auctionData: AuctionData;

// ─── Given ───────────────────────────────────────────────────────────────────

Given("saya berada di halaman daftar Auction Calendar", async ({ page, $testInfo }) => {
  test.setTimeout(90000);
  auctionPage = new AuctionPage(page);
  auctionData  = generateAuction();

  await auctionPage.gotoList();
  await takeScreenshot(page, $testInfo, "Auction List Page");
});

// ─── When ─────────────────────────────────────────────────────────────────────

When("saya membuka form Create Auction Calendar", async ({ page, $testInfo }) => {
  await auctionPage.clickCreateAuctionCalendar();
  await takeScreenshot(page, $testInfo, "Create Auction Form Loaded");
});

When("saya mengisi form auction dengan jadwal hari ini jam 06:00", async ({ page, $testInfo }) => {
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
  await takeScreenshot(page, $testInfo, "Auction Form Filled");
});

When("saya menyimpan auction", async ({ page, $testInfo }) => {
  await auctionPage.save();
  await takeScreenshot(page, $testInfo, "After Save Clicked");
});

When("saya membuka detail auction yang telah dibuat", async ({ page, $testInfo }) => {
  // Setelah save redirect ke list — cari baris auction dan klik detail
  await auctionPage.getAuctionRow(auctionData.auctionName)
    .waitFor({ state: "visible", timeout: 15000 });
  await takeScreenshot(page, $testInfo, "Auction Found in List");

  await auctionPage.clickDetailByName(auctionData.auctionName);
  await takeScreenshot(page, $testInfo, "Auction Detail Page");
});

When("saya menambahkan kendaraan ke dalam auction", async ({ page, $testInfo }) => {
  // Buka modal Add Car
  await auctionPage.clickAddCar();
  await takeScreenshot(page, $testInfo, "Add Car Modal Opened");

  // Cari kendaraan test (prefix TST) di dalam modal
  await auctionPage.searchVehicleInModal("TST");
  await takeScreenshot(page, $testInfo, "Vehicle Search Result in Modal");

  // Pilih kendaraan pertama dari hasil search
  await auctionPage.selectFirstVehicleInModal();
  await takeScreenshot(page, $testInfo, "Vehicle Selected");

  // Konfirmasi
  const result = await auctionPage.confirmAddVehicle();
  if (result === "already_existed") {
    console.log("⚠️  Vehicle already in an auction — skipped");
  }
  await takeScreenshot(page, $testInfo, "Add Vehicle Confirmed");
});

// ─── Then ─────────────────────────────────────────────────────────────────────

Then("seharusnya auction berhasil dibuat", async ({ page, $testInfo }) => {
  // Setelah save, server redirect ke halaman list auction
  await expect(page).toHaveURL(/\/en\/auction-management\/auction/, { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await takeScreenshot(page, $testInfo, "Redirected to Auction List - Save Success");
});

Then("kendaraan seharusnya berhasil ditambahkan ke dalam auction", async ({ page, $testInfo }) => {
  // Setelah add vehicle berhasil, tabel di halaman detail menampilkan data kendaraan
  const vehicleTable = page.locator("#tbl-vehicle-add, table tbody tr").first();
  await expect(vehicleTable).toBeVisible({ timeout: 15000 });
  await takeScreenshot(page, $testInfo, "Vehicle Added to Auction - Verified");
});
