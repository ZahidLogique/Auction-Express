import { createBdd } from "playwright-bdd";
import { expect, test } from "@playwright/test";
import { VehiclePage } from "../../../pages/VehiclePage";
import { generateVehicle } from "../../../helpers/random";

const { When } = createBdd();

// ── 1. Vehicle (Backend) ───────────────────────────────────────────────────────

/**
 * Buat kendaraan baru di Backoffice sebagai bagian dari E2E regression flow.
 * Dipanggil setelah login admin berhasil (session sudah aktif di page).
 * Menggunakan full URL karena regression project tidak punya baseURL.
 */
When("I add a new vehicle for testing", async ({ page }) => {
  test.setTimeout(90000); // login + form pengisian membutuhkan waktu total ~60-80 detik

  const vehiclePage = new VehiclePage(page);
  const vehicleData  = generateVehicle();

  // Navigasi ke list kendaraan menggunakan full URL (regression tidak punya baseURL)
  await page.goto(`${process.env.BACKOFFICE_URL}/en/vehicle/car`);
  await page.waitForLoadState("networkidle");

  // Ikuti alur user: klik tombol Register New Car
  await vehiclePage.clickRegisterNew();

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

  // Simpan dan verifikasi redirect ke list
  await vehiclePage.save();
  await expect(page).toHaveURL(/\/en\/vehicle\/car/, { timeout: 20000 });
});

// ── 2. Auction Session (Backend) — TODO ───────────────────────────────────────

// When("I create a new auction session", async ({ page }) => {
//   // TODO: Implement — buat sesi lelang baru di Backoffice
// });

// When("I assign the new vehicle to the auction session", async ({ page }) => {
//   // TODO: Implement — assign kendaraan ke sesi lelang
// });

// When("I publish the auction session", async ({ page }) => {
//   // TODO: Implement — publish sesi lelang
// });

// ── 4. Customer (FE Auction) — TODO ───────────────────────────────────────────

// When("I login with valid customer credentials", async ({ page }) => {
//   // TODO: Implement — login customer di FE Auction
//   // Gunakan: process.env.CUSTOMER_USER, process.env.CUSTOMER_PASS
// });

// Then("I should be ready to bid in the auction", async ({ page }) => {
//   // TODO: Implement — verifikasi customer bisa bidding
// });

// ── 4. Conductor (FE Conductor) — TODO ────────────────────────────────────────

// When("I login with valid conductor credentials", async ({ page }) => {
//   // TODO: Implement — login conductor di FE Conductor
//   // Gunakan: process.env.CONDUCTOR_USER, process.env.CONDUCTOR_PASS
// });

// Then("I should be ready to manage the auction", async ({ page }) => {
//   // TODO: Implement — verifikasi conductor bisa manage lelang
// });

// ── 5. Auction Flow — TODO ────────────────────────────────────────────────────

// When("the conductor starts the auction for lot {int}", async ({ page }, _lot: number) => {
//   // TODO: Implement — conductor mulai lelang untuk lot tertentu
// });

// When("the customer places a bid on lot {int}", async ({ page }, _lot: number) => {
//   // TODO: Implement — customer melakukan bid
// });

// When("the conductor accepts the bid and moves to the next lot", async ({ page }) => {
//   // TODO: Implement — conductor terima bid & lanjut lot berikutnya
// });

// When("the conductor ends the auction session", async ({ page }) => {
//   // TODO: Implement — conductor akhiri sesi lelang
// });

// ── 6. Post-Auction Verification — TODO ──────────────────────────────────────

// Then("the auction status should be completed", async ({ page }) => {
//   // TODO: Implement — verifikasi status lelang completed
// });

// Then("the transaction should be recorded in Backoffice", async ({ page }) => {
//   // TODO: Implement — verifikasi transaksi tercatat di Backoffice
// });
