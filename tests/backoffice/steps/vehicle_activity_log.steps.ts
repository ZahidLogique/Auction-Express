import { createBdd } from "playwright-bdd";
import { Page } from "@playwright/test";
import { expect, test } from "../../../fixtures/base";
import { VehiclePage } from "../../../pages/backoffice/VehiclePage";
import { VehicleDetailPage } from "../../../pages/backoffice/VehicleDetailPage";
import { generateVehicle, VehicleData } from "../../../helpers/random";
import { takeScreenshot } from "../../../helpers/screenshot";

const { Given, When, Then } = createBdd(test);

// AE-487 — ketiga scenario tidak butuh riwayat khusus, jadi tiap scenario membuat kendaraan sendiri.
// (Tidak memakai step di vehicle.steps.ts karena plat nomornya private di file itu.)
let vehiclePage: VehiclePage;
let vehicleData: VehicleData;
let detailTab: Page;
let detail: VehicleDetailPage;

/** Buka detail kendaraan uji dari daftar (double-click baris → tab baru), lalu tunggu action bar. */
async function openDetail(page: Page) {
  await vehiclePage.searchVehicle(vehicleData.licensePlate);
  detailTab = await vehiclePage.clickEditForRow(vehicleData.licensePlate);
  detail = new VehicleDetailPage(detailTab);
  await detail.waitForActionBar();
}

// ─── Given ───────────────────────────────────────────────────────────────────

Given(
  "saya memiliki kendaraan uji baru untuk pengecekan activity log",
  async ({ page, $testInfo }) => {
    test.setTimeout(180000);
    vehiclePage = new VehiclePage(page);
    // generateVehicle() hanya memberi 4 digit acak ("TST1234") dan staging menumpuk kendaraan uji lama,
    // jadi plat bisa bentrok ("Units with ... have been registered"). Pakai 6 digit dari waktu agar unik.
    vehicleData = {
      ...generateVehicle(),
      licensePlate: `TST${Date.now().toString().slice(-6)}`,
    };

    await vehiclePage.gotoList();
    await vehiclePage.clickRegisterNew();
    await vehiclePage.fillCreateForm({
      licensePlate: vehicleData.licensePlate,
      province: vehicleData.province,
      seller: vehicleData.seller,
      brand: vehicleData.brand,
      groupType: vehicleData.groupType,
      subModel: vehicleData.subModel,
      color: vehicleData.color,
      transmission: vehicleData.transmission,
      fuel: vehicleData.fuel,
      drive: vehicleData.drive,
      manufactYear: vehicleData.manufactYear,
      mileage: vehicleData.mileage,
      engineNo: vehicleData.engineNo,
      vin: vehicleData.vin,
    });
    await vehiclePage.save();

    await expect(page).toHaveURL(/\/en\/vehicle\/car/, { timeout: 20000 });
    await page.locator("button:has-text('Search')").first()
      .waitFor({ state: "attached", timeout: 60000 });
    await takeScreenshot(page, $testInfo, "Kendaraan Uji Dibuat");
  }
);

// ─── When ────────────────────────────────────────────────────────────────────

When(
  "saya membuka halaman detail kendaraan uji tersebut",
  async ({ page, $testInfo }) => {
    await openDetail(page);
    await takeScreenshot(detailTab, $testInfo, "Halaman Detail Kendaraan");
  }
);

When(
  "saya membuka halaman edit kendaraan uji tersebut",
  async ({ page, $testInfo }) => {
    await openDetail(page);
    await Promise.all([
      detailTab.waitForURL(/\/vehicle\/car\/edit\//, { timeout: 30000 }),
      detail.clickBarButton("Edit"),
    ]);
    await detail.waitForActionBar();
    await takeScreenshot(detailTab, $testInfo, "Halaman Edit Kendaraan");
  }
);

When(
  "saya menekan tombol Activity Log di bar tombol",
  async ({ $testInfo }) => {
    await detail.openActivityLog();
    await takeScreenshot(detailTab, $testInfo, "Panel Activity Log Terbuka");
  }
);

// ─── Then ────────────────────────────────────────────────────────────────────

Then(
  "bar tombol di halaman detail seharusnya berisi tombol Back, Activity Log, Admin Check, dan Edit",
  async ({ $testInfo }) => {
    await detail.expectBarButtons(["Back", "Activity Log", "Admin Check", "Edit"]);
    await takeScreenshot(detailTab, $testInfo, "Tombol Bar Detail Terverifikasi");
  }
);

Then(
  "bar tombol di halaman edit seharusnya berisi tombol Cancel, Activity Log, dan Save",
  async ({ $testInfo }) => {
    await detail.expectBarButtons(["Cancel", "Activity Log", "Save"]);
    await takeScreenshot(detailTab, $testInfo, "Tombol Bar Edit Terverifikasi");
  }
);

Then(
  "bar tombol di halaman edit seharusnya tidak berisi tombol Admin Check",
  async () => {
    await detail.expectBarHasNoButton("Admin Check");
  }
);

Then(
  "bar tombol seharusnya tetap terlihat saat halaman di-scroll ke bawah dan kembali ke atas",
  async ({ $testInfo }) => {
    await detail.scrollToBottom();
    await detail.expectBarNearTop();
    await takeScreenshot(detailTab, $testInfo, "Bar Setelah Scroll ke Bawah");
    await detail.scrollToTop();
    await detail.expectBarInViewport();
  }
);

Then(
  "panel Activity Log seharusnya terbuka dengan filter tanggal, User, Field Changed, serta tombol Filter dan Clear",
  async () => {
    await detail.expectFilterControls();
  }
);

Then(
  "panel Activity Log seharusnya menampilkan daftar entri atau pesan kosong tanpa pesan gagal memuat",
  async ({ $testInfo }) => {
    await detail.expectLogLoadedWithoutError();
    await takeScreenshot(detailTab, $testInfo, "Isi Panel Activity Log");
  }
);
