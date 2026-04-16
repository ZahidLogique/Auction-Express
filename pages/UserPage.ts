import { Page, Locator } from "@playwright/test";

export class UserPage {
  readonly page: Page;

  // ── List Page ─────────────────────────────────────────────────────────────
  readonly addUserButton: Locator;
  readonly searchInput:   Locator;

  // ── Modal Form ────────────────────────────────────────────────────────────
  readonly locationCabuyao:     Locator;
  readonly usernameInput:       Locator;
  readonly roleDropdownTrigger: Locator;
  readonly roleFilterInput:     Locator;
  readonly fullNameInput:       Locator;
  readonly emailInput:          Locator;
  readonly positionsInput:      Locator;
  readonly phoneInput:          Locator;
  readonly mobileInput:         Locator;
  readonly statusSelect:        Locator;
  readonly saveButton:          Locator;

  // ── Delete Confirmation Modal ──────────────────────────────────────────────
  readonly deleteConfirmButton: Locator;

  // ── Response ──────────────────────────────────────────────────────────────
  readonly toastSuccess: Locator;

  constructor(page: Page) {
    this.page = page;

    // List page
    this.addUserButton = page.locator('button:has-text("Add User")');
    this.searchInput   = page.locator('input[placeholder="Search..."]');

    // Location checkboxes (TAA Cabuyao dipilih sebagai default test data)
    this.locationCabuyao = page.locator('input[type="checkbox"][value="01916e67-ec5f-7e84-bce0-8a2154f3ea83"]');

    // Form inputs
    this.usernameInput  = page.locator('input[placeholder="Username"]');
    this.fullNameInput  = page.locator('input[placeholder="Full Name"]');
    this.emailInput     = page.locator('input[placeholder="Email"]');
    this.positionsInput = page.locator('input[placeholder="Positions"]');
    this.phoneInput     = page.locator('input[placeholder="Phone Number"]');
    this.mobileInput    = page.locator('input[placeholder="Mobile Number"]');

    // Role — custom Alpine.js dropdown (bukan native <select>)
    this.roleDropdownTrigger = page.locator('#selectfield + span');
    this.roleFilterInput     = page.locator('[x-ref="filterinput"]');

    // Status — native <select> satu-satunya yang punya option value="1"
    this.statusSelect = page.locator('select').filter({
      has: page.locator('option[value="1"]'),
    });

    // Submit
    this.saveButton = page.locator('button[type="submit"]:has-text("Save")');

    // Delete confirmation
    this.deleteConfirmButton = page.locator('button:has-text("Yes")');

    // Toast sukses: elemen dalam #toaster yang punya class green (Alpine binding)
    // Error toast pakai class red — selector ini tidak akan menangkap error toast
    this.toastSuccess = page.locator('#toaster [class*="green"]').first();
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto("/user-management/users");
  }

  // ── List Page Actions ─────────────────────────────────────────────────────

  async openAddUserModal() {
    await this.addUserButton.click();
    await this.usernameInput.waitFor({ state: "visible" });
  }

  /** Cari user di tabel, tunggu debounce 700ms + networkidle */
  async searchUser(username: string) {
    await this.searchInput.fill(username);
    await this.page.waitForTimeout(800); // debounce 700ms
    await this.page.waitForLoadState("networkidle");
  }

  /** Locator untuk baris tabel yang mengandung username */
  getRow(username: string): Locator {
    return this.page
      .locator("tbody tr")
      .filter({ hasText: username });
  }

  /** Klik tombol Edit (kuning) pada baris user yang dicari */
  async clickEditInRow(username: string) {
    await this.getRow(username).locator("button.bg-yellow-400").click();
    await this.usernameInput.waitFor({ state: "visible" });
  }

  /** Klik tombol Delete (merah) pada baris user yang dicari */
  async clickDeleteInRow(username: string) {
    await this.getRow(username).locator("button.bg-red-700").click();
    await this.deleteConfirmButton.waitFor({ state: "visible" });
  }

  /** Konfirmasi hapus di modal konfirmasi */
  async confirmDelete() {
    await this.deleteConfirmButton.click();
  }

  // ── Form Actions ──────────────────────────────────────────────────────────

  async selectRole(roleName: string) {
    await this.roleDropdownTrigger.click();
    await this.roleFilterInput.waitFor({ state: "visible" });
    await this.roleFilterInput.fill(roleName);
    await this.page
      .locator(".absolute.z-10 ul li")
      .filter({ hasText: roleName })
      .first()
      .click();
  }

  async fillForm(data: {
    username: string;
    fullName: string;
    email:    string;
    role:     string;
    position: string;
    phone:    string;
    mobile:   string;
  }) {
    // ── Step 1: Isi field wire:model.LIVE terlebih dahulu ─────────────────
    await this.locationCabuyao.check();
    await this.page.waitForLoadState("networkidle");

    await this.selectRole(data.role);
    await this.page.waitForLoadState("networkidle");

    await this.statusSelect.selectOption("1"); // Active
    await this.page.waitForLoadState("networkidle");

    // ── Step 2: Baru isi field wire:model.DEFER ───────────────────────────
    await this.usernameInput.fill(data.username);
    await this.fullNameInput.fill(data.fullName);
    await this.emailInput.fill(data.email);
    await this.positionsInput.fill(data.position);
    await this.phoneInput.fill(data.phone);
    await this.mobileInput.fill(data.mobile);
  }

  async submit() {
    await this.saveButton.click();
  }
}
