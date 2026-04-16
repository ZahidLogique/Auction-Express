import { createBdd } from "playwright-bdd";
import { expect, test } from "@playwright/test";
import { VehiclePage } from "../../../pages/VehiclePage";
import { generateVehicle, VehicleData } from "../../../helpers/random";
import { takeScreenshot } from "../../../helpers/screenshot";

const { Given, When, Then } = createBdd();

let vehiclePage: VehiclePage;
let vehicleData: VehicleData;

// ─── Given ───────────────────────────────────────────────────────────────────

/**
 * TC-VEH-001: Buat kendaraan baru (full form) lalu tunggu redirect ke list page.
 * setTimeout 60000 karena pengisian form lengkap + redirect membutuhkan waktu lebih dari 30 detik.
 */
Given(
  "saya telah membuat kendaraan baru dan berada di halaman daftar kendaraan",
  async ({ page, $testInfo }) => {
    test.setTimeout(60000);
    vehiclePage = new VehiclePage(page);
    vehicleData  = generateVehicle();

    // Ikuti alur user: buka list → klik Register New Car
    await vehiclePage.gotoList();
    await page.waitForLoadState("networkidle");
    await vehiclePage.clickRegisterNew();
    await takeScreenshot(page, $testInfo, "Create Vehicle Page Loaded");

    // Isi semua field form
    await vehiclePage.fillCreateForm({
      licensePlate:  vehicleData.licensePlate,
      province:      vehicleData.province,
      seller:        vehicleData.seller,
      brand:         vehicleData.brand,
      groupType:     vehicleData.groupType,
      subModel:      vehicleData.subModel,
      color:         vehicleData.color,
      transmission:  vehicleData.transmission,
      fuel:          vehicleData.fuel,
      drive:         vehicleData.drive,
      manufactYear:  vehicleData.manufactYear,
      mileage:       vehicleData.mileage,
      engineNo:      vehicleData.engineNo,
      vin:           vehicleData.vin,
    });
    await takeScreenshot(page, $testInfo, "Form Filled");

    // Simpan
    await vehiclePage.save();

    // Tunggu redirect ke list page
    await expect(page).toHaveURL(/\/en\/vehicle\/car/, { timeout: 20000 });
    await page.waitForLoadState("networkidle");

    // Pastikan list page siap (Livewire selesai mount) sebelum Given selesai
    await page.locator("button#search").waitFor({ state: "visible", timeout: 15000 });
    await takeScreenshot(page, $testInfo, "Vehicle Created - Redirected to List");
  }
);

// ─── When ─────────────────────────────────────────────────────────────────────

When(
  "saya mencari kendaraan dengan nomor polisi yang telah dibuat",
  async ({ page, $testInfo }) => {
    await vehiclePage.searchVehicle(vehicleData.licensePlate);
    await takeScreenshot(page, $testInfo, "Search Result");
  }
);

// ─── Then ─────────────────────────────────────────────────────────────────────

Then(
  "data kendaraan seharusnya tampil di tabel dengan informasi yang benar",
  async ({ page, $testInfo }) => {
    const row = vehiclePage.getRow(vehicleData.licensePlate);
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(vehicleData.licensePlate);
    await takeScreenshot(page, $testInfo, "Vehicle Data Verified in Table");
  }
);
