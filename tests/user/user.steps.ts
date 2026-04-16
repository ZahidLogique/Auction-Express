import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { UserPage } from "../../pages/UserPage";
import { generateUser, UserData } from "../../helpers/random";
import { takeScreenshot } from "../../helpers/screenshot";

const { Given, When, Then } = createBdd();

// State yang di-share antar scenario dalam satu test run (sequential)
let userPage:         UserPage;
let userData:         UserData;
let updatedFullName:  string;

// ─── Given ───────────────────────────────────────────────────────────────────

Given("saya berada di halaman User Management", async ({ page, $testInfo }) => {
  userPage = new UserPage(page);
  await userPage.goto();
  await takeScreenshot(page, $testInfo, "User Management Page");
});

/**
 * Compound Given untuk TC-USER-002/003/004:
 * Setiap scenario create user-nya sendiri agar independen dari TC-USER-001.
 */
Given("saya telah membuat user baru dan berada di halaman User Management", async ({ page, $testInfo }) => {
  userPage  = new UserPage(page);
  userData  = generateUser();

  await userPage.goto();
  await userPage.openAddUserModal();
  await page.waitForLoadState("networkidle");

  await userPage.fillForm({
    username: userData.username,
    fullName: userData.fullName,
    email:    userData.email,
    role:     "Admin",
    position: userData.position,
    phone:    userData.phone,
    mobile:   userData.mobile,
  });

  await userPage.submit();
  await page.waitForLoadState("networkidle");
  // Tunggu toast sukses, lalu lanjut ke list
  await expect(userPage.toastSuccess).toBeVisible({ timeout: 8000 });
  await takeScreenshot(page, $testInfo, "User Created as Prerequisite");
});

// ─── When ─────────────────────────────────────────────────────────────────────

When("saya membuka form tambah user baru", async ({ page, $testInfo }) => {
  await userPage.openAddUserModal();
  await page.waitForLoadState("networkidle");
  await takeScreenshot(page, $testInfo, "Add User Modal Opened");
});

When("saya mengisi form dengan data user yang valid dan role Admin", async ({ page, $testInfo }) => {
  userData = generateUser();

  await userPage.fillForm({
    username: userData.username,
    fullName: userData.fullName,
    email:    userData.email,
    role:     "Admin",
    position: userData.position,
    phone:    userData.phone,
    mobile:   userData.mobile,
  });

  await takeScreenshot(page, $testInfo, "Form Filled");
});

When("saya menyimpan data user", async ({ page, $testInfo }) => {
  await userPage.submit();
  await page.waitForLoadState("networkidle");
  await takeScreenshot(page, $testInfo, "After Save Clicked");
});

// ── TC-USER-002: Read ─────────────────────────────────────────────────────────

When("saya mencari user dengan username yang telah dibuat", async ({ page, $testInfo }) => {
  await userPage.searchUser(userData.username);
  await takeScreenshot(page, $testInfo, "Search Result");
});

// ── TC-USER-003: Update ───────────────────────────────────────────────────────

When("saya membuka form edit user tersebut", async ({ page, $testInfo }) => {
  await userPage.clickEditInRow(userData.username);
  await page.waitForLoadState("networkidle");
  await takeScreenshot(page, $testInfo, "Edit Modal Opened");
});

When("saya mengubah full name user menjadi data baru", async ({ page, $testInfo }) => {
  updatedFullName = userData.fullName + " (Updated)";
  await userPage.fullNameInput.clear();
  await userPage.fullNameInput.fill(updatedFullName);
  await takeScreenshot(page, $testInfo, "Full Name Changed");
});

When("saya menyimpan perubahan data user", async ({ page, $testInfo }) => {
  await userPage.submit();
  await page.waitForLoadState("networkidle");
  await takeScreenshot(page, $testInfo, "After Update Saved");
});

// ── TC-USER-004: Delete ───────────────────────────────────────────────────────

When("saya menghapus user tersebut", async ({ page, $testInfo }) => {
  await userPage.clickDeleteInRow(userData.username);
  await takeScreenshot(page, $testInfo, "Delete Confirmation Modal");
  await userPage.confirmDelete();
  await page.waitForLoadState("networkidle");
  await takeScreenshot(page, $testInfo, "After Delete Confirmed");
});

// ─── Then ─────────────────────────────────────────────────────────────────────

Then("seharusnya muncul notifikasi sukses pembuatan user", async ({ page, $testInfo }) => {
  await expect(userPage.toastSuccess).toBeVisible({ timeout: 8000 });
  await takeScreenshot(page, $testInfo, "Success Toast Appeared");
});

Then("data user seharusnya tampil di tabel dengan informasi yang benar", async ({ page, $testInfo }) => {
  const row = userPage.getRow(userData.username);
  await expect(row).toBeVisible({ timeout: 5000 });
  await expect(row).toContainText(userData.fullName);
  await expect(row).toContainText(userData.email);
  await expect(row).toContainText("Admin");
  await expect(row).toContainText("Active");
  await takeScreenshot(page, $testInfo, "User Data Verified");
});

Then("seharusnya muncul notifikasi sukses perubahan data user", async ({ page, $testInfo }) => {
  await expect(userPage.toastSuccess).toBeVisible({ timeout: 8000 });
  await takeScreenshot(page, $testInfo, "Update Success Toast");
});

Then("seharusnya muncul notifikasi sukses penghapusan user", async ({ page, $testInfo }) => {
  await expect(userPage.toastSuccess).toBeVisible({ timeout: 8000 });
  await takeScreenshot(page, $testInfo, "Delete Success Toast");
});

Then("user tidak lagi tampil di tabel", async ({ page, $testInfo }) => {
  await userPage.searchUser(userData.username);
  await expect(userPage.getRow(userData.username)).not.toBeVisible({ timeout: 5000 });
  await takeScreenshot(page, $testInfo, "User Deleted Verified");
});
