import { Page, Locator } from "@playwright/test";

export class VehiclePage {
  readonly page: Page;

  // ── Create Form ────────────────────────────────────────────────────────────
  // Semua input di-scope ke #form-list agar tidak mengenai #form-base (template tersembunyi)
  readonly modelCodeInput:    Locator;
  readonly applyButton:       Locator;
  readonly entryDateInput:    Locator;
  readonly licensePlateInput: Locator;
  readonly manufactYearInput: Locator;
  readonly mileageInput:      Locator;
  readonly engineNoInput:     Locator;
  readonly vinInput:          Locator;
  readonly saveButton:        Locator;

  // ── List Page ──────────────────────────────────────────────────────────────
  readonly searchInput:  Locator;
  readonly searchButton: Locator;

  // ── Notification (SweetAlert2) ─────────────────────────────────────────────
  readonly sweetAlertTitle:      Locator;
  readonly sweetAlertConfirmBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // Create form — scoped ke #form-list agar tidak mengenai #form-base (hidden template)
    this.modelCodeInput    = page.locator("#form-list input.model_code").first();
    this.applyButton       = page.locator("#form-list button.btn-apply").first();
    this.entryDateInput    = page.locator("#form-list input.car_entry_date").first();
    this.licensePlateInput = page.locator("#form-list input.car_reg_no").first();
    this.manufactYearInput = page.locator("#form-list input.car_man_year").first();
    this.mileageInput      = page.locator("#form-list input.car_mileage").first();
    this.engineNoInput     = page.locator("#form-list input.car_enging_no").first();
    this.vinInput          = page.locator("#form-list input.car_vin").first();
    this.saveButton        = page.locator("button#save");

    // List page search
    this.searchInput  = page.locator('[wire\\:model\\.defer="filter.search"]');
    this.searchButton = page.locator("button#search");

    // SweetAlert2
    this.sweetAlertTitle      = page.locator(".swal2-title");
    this.sweetAlertConfirmBtn = page.locator(".swal2-confirm");
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async gotoList() {
    await this.page.goto("/en/vehicle/car");
  }

  /**
   * Klik tombol "+ Register New Car" dari halaman list.
   * Ini adalah entry point yang benar sesuai alur user — jangan langsung goto URL create.
   */
  async clickRegisterNew() {
    await this.page
      .locator('a.btn[href*="/vehicle/car/create"], a[title*="Register New Car"]')
      .first()
      .click();
    await this.page.waitForLoadState("networkidle");
  }

  // ── Select2 Helper ─────────────────────────────────────────────────────────

  /**
   * Memilih opsi di dropdown Select2.
   *
   * Cara kerja: cari <select> target di dalam #form-list, naik ke parent div-nya,
   * lalu klik .select2-selection yang ada sebagai sibling span di parent yang sama.
   *
   * @param cssClass  - class CSS pada elemen <select> (contoh: "brand_id")
   * @param text      - teks opsi yang ingin dipilih
   */
  async selectFromSelect2(cssClass: string, text: string) {
    // Ambil elemen <select> target di dalam #form-list
    const targetSelect = this.page
      .locator(`#form-list select.${cssClass}`)
      .first();

    // Naik ke parent langsung (mis. div.col-sm-8) → Select2 menaruh span-nya sebagai sibling
    // Struktur: parent-div > [ select.hidden | span.select2-container > span.select2-selection ]
    const selectionSpan = targetSelect
      .locator("..")
      .locator(".select2-selection")
      .first();

    await selectionSpan.scrollIntoViewIfNeeded();
    await selectionSpan.click();

    // Tunggu dropdown muncul
    await this.page
      .locator(".select2-dropdown")
      .waitFor({ state: "visible", timeout: 10000 });

    // Isi search field jika ada (Select2 dengan search enabled)
    const searchField = this.page.locator(".select2-search__field").first();
    const hasSearch = await searchField
      .isVisible({ timeout: 1500 })
      .catch(() => false);

    if (hasSearch) {
      await searchField.fill(text);
      await this.page.waitForTimeout(400); // tunggu debounce filter Select2
    }

    // Klik opsi yang cocok (abaikan opsi disabled)
    await this.page
      .locator(".select2-results__option:not(.select2-results__option--disabled)")
      .filter({ hasText: text })
      .first()
      .click();
  }

  // ── Fill Create Form ───────────────────────────────────────────────────────

  /**
   * Mengisi form Create IMS Vehicle.
   *
   * Urutan pengisian:
   *  1. Province DULU (sebelum license plate) agar AJAX check tidak trigger saat province dipilih
   *  2. License Plate
   *  3. Customer Name (membership_id_ori)
   *  4. Brand → memicu AJAX load Model list
   *  5. Model (group_type_id) → memicu AJAX load Sub Model list
   *  6. Sub Model (opsional)
   *  7. Color, Transmission, Fuel, Drive (Select2)
   *  8. Manufacturing Year, Mileage, Engine No, VIN (text input)
   */
  async fillCreateForm(data: {
    licensePlate:  string;
    province:      string;
    seller:        string;   // "Customer Name" → select.membership_id_ori
    brand:         string;
    groupType:     string;   // "Model" → select.group_type_id
    subModel?:     string;   // "Sub Model" → select.type_id (opsional)
    color?:        string;   // select.color_id
    transmission?: string;   // select.car_transmission: AT | MT
    fuel?:         string;   // select.fuel_id: Benzine | Diesel | etc.
    drive?:        string;   // select.drive_description: FWD | RWD | 4WD
    manufactYear?: string;   // input.car_man_year
    mileage?:      string;   // input.car_mileage
    engineNo?:     string;   // input.car_enging_no
    vin?:          string;   // input.car_vin
  }) {
    // 1. Province DULU (Select2, required)
    await this.selectFromSelect2("province_code", data.province);

    // 2. Nomor polisi (required)
    await this.licensePlateInput.fill(data.licensePlate);

    // 3. Customer Name / Seller (Select2, required)
    await this.selectFromSelect2("membership_id_ori", data.seller);

    // 4. Brand (Select2, required) → memicu AJAX load Model
    await this.selectFromSelect2("brand_id", data.brand);
    await this.page.waitForLoadState("networkidle");

    // Tunggu dropdown Model benar-benar terisi setelah AJAX selesai
    // (select2-hidden-accessible harus punya opsi selain placeholder)
    await this.page.waitForFunction(() => {
      const sel = document.querySelector("#form-list select.group_type_id") as HTMLSelectElement;
      return sel && sel.options.length > 1;
    }, { timeout: 15000 });

    // 5. Model / Group Type (Select2, required) → memicu AJAX load Sub Model
    await this.selectFromSelect2("group_type_id", data.groupType);
    await this.page.waitForLoadState("networkidle");

    // 6. Sub Model (opsional)
    if (data.subModel) {
      await this.selectFromSelect2("type_id", data.subModel);
    }

    // 7. Select2 fields tambahan
    if (data.color)        await this.selectFromSelect2("color_id", data.color);
    if (data.transmission) await this.selectFromSelect2("car_transmission", data.transmission);
    if (data.fuel)         await this.selectFromSelect2("fuel_id", data.fuel);
    if (data.drive)        await this.selectFromSelect2("drive_description", data.drive);

    // 8. Text input fields tambahan
    if (data.manufactYear) await this.manufactYearInput.fill(data.manufactYear);
    if (data.mileage)      await this.mileageInput.fill(data.mileage);
    if (data.engineNo)     await this.engineNoInput.fill(data.engineNo);
    if (data.vin)          await this.vinInput.fill(data.vin);
  }

  async save() {
    await this.saveButton.click();
  }

  // ── List Actions ──────────────────────────────────────────────────────────

  async searchVehicle(keyword: string) {
    await this.searchInput.waitFor({ state: "visible", timeout: 15000 });
    await this.searchInput.fill(keyword);
    await this.searchButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  getRow(licensePlate: string): Locator {
    return this.page.locator("tbody tr").filter({ hasText: licensePlate });
  }
}
