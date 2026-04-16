import { Page, Locator } from "@playwright/test";

export class MembershipPage {
  readonly page: Page;

  // ── List Page ─────────────────────────────────────────────────────────────
  readonly addMembershipButton: Locator;
  readonly searchInput:         Locator;

  // ── Form: Dropdowns (native select, wire:model.live) ──────────────────────
  readonly customerTypeSelect:    Locator;
  readonly taxStatusSelect:       Locator;
  readonly membershipRoleSelect:  Locator;
  readonly tSureDealerSelect:     Locator;

  // ── Form: Name fields (muncul setelah Customer Type dipilih) ─────────────
  readonly firstNameInput:  Locator;
  readonly lastNameInput:   Locator;

  // ── Form: Info fields ─────────────────────────────────────────────────────
  readonly taxIdInput:   Locator;
  readonly emailInput:   Locator;
  readonly phoneInput:   Locator;
  readonly mobileInput:  Locator;
  readonly notesArea:    Locator;

  // ── Form: Invoice Address ─────────────────────────────────────────────────
  readonly invoiceRoadInput:       Locator;
  readonly invoicePostalCodeInput: Locator;

  // ── Form: Delivery Address ────────────────────────────────────────────────
  readonly sameAsAboveCheckbox: Locator;

  // ── Form: Input By (Alpine.js dropdown, sama pola seperti role di UserPage)
  readonly inputByTrigger:     Locator;
  readonly inputByFilterInput: Locator;

  // ── Form: Save ────────────────────────────────────────────────────────────
  readonly saveButton: Locator;

  // ── Response ──────────────────────────────────────────────────────────────
  readonly toastSuccess: Locator;

  constructor(page: Page) {
    this.page = page;

    // List page
    this.addMembershipButton = page.locator('a[href*="membership/create"]');
    this.searchInput         = page.locator('input[placeholder="Search..."]');

    // Native selects — difilter by unique option text agar tidak salah target
    this.customerTypeSelect   = page.locator('select').filter({ has: page.locator('option:has-text("Individual")') });
    this.taxStatusSelect      = page.locator('select').filter({ has: page.locator('option:has-text("VAT Exempt")') });
    this.membershipRoleSelect = page.locator('select').filter({ has: page.locator('option:has-text("Buyer")') });
    // T-Sure Dealer: select dengan wire:model.live="tSureDealer"
    this.tSureDealerSelect    = page.locator('[wire\\:model\\.live="tSureDealer"]');

    // Name fields — muncul setelah typeId dipilih (wire:model.defer)
    this.firstNameInput = page.locator('[wire\\:model\\.defer="firstName"]');
    this.lastNameInput  = page.locator('[wire\\:model\\.defer="lastName"]');

    // Info fields
    this.taxIdInput  = page.locator('input[placeholder="Tax Identification Number"]');
    this.emailInput  = page.locator('input[placeholder="Email"]');
    this.phoneInput  = page.locator('input[placeholder="Phone"]');
    this.mobileInput = page.locator('input[placeholder="Mobile No."]');
    this.notesArea   = page.locator('textarea[wire\\:model\\.defer="notes"]');

    // Invoice address
    this.invoiceRoadInput       = page.locator('input[placeholder="Road"]').first();
    this.invoicePostalCodeInput = page.locator('input[placeholder="Postal Code"]').first();

    // Delivery address — checkbox "Same As Above"
    this.sameAsAboveCheckbox = page.locator('[wire\\:model\\.live="deliveryAddress.isSameAddress"]');

    // Input By — Alpine.js dropdown (pola sama dengan role dropdown di UserPage)
    // Dropdown ini adalah #selectfield + span pertama di halaman
    this.inputByTrigger    = page.locator('#selectfield + span').first();
    this.inputByFilterInput = page.locator('[x-ref="filterinput"]').first();

    // Save
    this.saveButton = page.locator('button[wire\\:click="save"]');

    // Toast sukses
    this.toastSuccess = page.locator('#toaster [class*="green"]').first();
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto("/en/membership-management/membership");
  }

  async gotoCreate() {
    await this.page.goto("/en/membership-management/membership/create");
  }

  // ── Form Actions ──────────────────────────────────────────────────────────

  async selectInputBy(name: string) {
    await this.inputByTrigger.click();
    await this.inputByFilterInput.waitFor({ state: "visible" });
    await this.inputByFilterInput.fill(name);
    await this.page
      .locator(".absolute.z-10 ul li")
      .filter({ hasText: name })
      .first()
      .click();
  }

  async fillForm(data: {
    firstName:  string;
    lastName:   string;
    taxId:      string;
    taxStatus:  string;
    role:       string;
    email:      string;
    phone:      string;
    mobile:     string;
    road:       string;
    postalCode: string;
    inputBy:    string;
    tSureDealer?: string; // opsional — pilih first option jika tidak diisi
  }) {
    // ── Step 1: LIVE fields — setiap pilihan memicu Livewire re-render ─────

    // Customer Type: Individual (memunculkan firstName, lastName)
    await this.customerTypeSelect.selectOption({ label: "Individual" });
    await this.page.waitForLoadState("networkidle");

    // Tax Status
    await this.taxStatusSelect.selectOption({ label: data.taxStatus });
    await this.page.waitForLoadState("networkidle");

    // Customer Role
    await this.membershipRoleSelect.selectOption({ label: data.role });
    await this.page.waitForLoadState("networkidle");

    // T-Sure Dealer: value "true" = Yes, "false" = No
    await this.tSureDealerSelect.selectOption(data.tSureDealer ?? "true");
    await this.page.waitForLoadState("networkidle");

    // Input By
    await this.selectInputBy(data.inputBy);
    await this.page.waitForLoadState("networkidle");

    // ── Step 2: DEFER fields — isi setelah semua re-render selesai ─────────

    await this.firstNameInput.waitFor({ state: "visible" });
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);

    await this.taxIdInput.fill(data.taxId);
    await this.emailInput.fill(data.email);
    await this.phoneInput.fill(data.phone);
    await this.mobileInput.fill(data.mobile);

    // Invoice Address
    await this.invoiceRoadInput.fill(data.road);
    await this.invoicePostalCodeInput.fill(data.postalCode);

    // Delivery Address: gunakan "Same As Above"
    await this.sameAsAboveCheckbox.check();
  }

  async submit() {
    await this.saveButton.click();
  }
}
