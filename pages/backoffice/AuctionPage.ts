import { Page, Locator } from "@playwright/test";

export class AuctionPage {
  readonly page: Page;

  // ── List Page ──────────────────────────────────────────────────────────────
  readonly createButton: Locator;

  // ── Create Form ────────────────────────────────────────────────────────────
  readonly auctionDateInput:   Locator;
  readonly auctionNameInput:   Locator;
  readonly lotNumberInput:     Locator;
  readonly laneInput:          Locator;
  readonly auctionTypeSelect:  Locator;
  readonly auctionMethodSelect: Locator;
  readonly startTimerInput:    Locator;
  readonly resetTimerInput:    Locator;
  readonly saveButton:         Locator;

  constructor(page: Page) {
    this.page = page;

    // List page
    this.createButton = page.locator('a.btn-success[href*="create"]');

    // Create form
    this.auctionDateInput    = page.locator("#auctionDate");
    this.auctionNameInput    = page.locator("#auctionName");
    this.lotNumberInput      = page.locator("#lot_number");
    this.laneInput           = page.locator("#laneNumber");
    this.auctionTypeSelect   = page.locator("#auctionType");
    this.auctionMethodSelect = page.locator("#auctionMethod");
    this.startTimerInput     = page.locator("#startTimer");
    this.resetTimerInput     = page.locator("#resetTimer");
    this.saveButton          = page.locator("#btn_save");
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async gotoList() {
    await this.page.goto("/en/auction-management/auction");
    await this.page.waitForLoadState("networkidle");
  }

  async clickCreateAuctionCalendar() {
    await this.createButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  // ── Select2 Helper (by element id) ────────────────────────────────────────

  /**
   * Pilih opsi Select2 menggunakan id element <select>.
   * Berbeda dari VehiclePage yang scope ke #form-list,
   * di sini langsung pakai id karena form tidak punya #form-list wrapper.
   */
  async selectFromSelect2ById(elementId: string, text: string) {
    const targetSelect  = this.page.locator(`select#${elementId}`);
    const selectionSpan = targetSelect.locator("..").locator(".select2-selection").first();

    await selectionSpan.scrollIntoViewIfNeeded();
    await selectionSpan.click();

    await this.page
      .locator(".select2-dropdown")
      .waitFor({ state: "visible", timeout: 10000 });

    const searchField = this.page.locator(".select2-search__field").first();
    const hasSearch   = await searchField.isVisible({ timeout: 1500 }).catch(() => false);

    if (hasSearch) {
      await searchField.fill(text);
      await this.page.waitForTimeout(400);
    }

    // Tunggu opsi pertama muncul dulu (AJAX load) sebelum filter & click
    await this.page
      .locator(".select2-results__option")
      .first()
      .waitFor({ state: "visible", timeout: 8000 });

    await this.page
      .locator(".select2-results__option:not(.select2-results__option--disabled)")
      .filter({ hasText: text })
      .first()
      .click();
  }

  // ── Flatpickr Time Helper ──────────────────────────────────────────────────

  /**
   * Set nilai Flatpickr timepicker yang bersifat readonly.
   * Tidak bisa pakai fill() langsung — gunakan Flatpickr JS API via evaluate().
   *
   * @param time - format "HH:MM" contoh "06:00"
   */
  async setFlatpickrTime(time: string) {
    await this.page.locator("#startTime").click();
    await this.page.waitForTimeout(300); // tunggu picker terbuka

    await this.page.evaluate((t) => {
      const input = document.querySelector("#startTime") as any;
      if (input && input._flatpickr) {
        input._flatpickr.setDate(t, true);
      }
    }, time);

    await this.page.keyboard.press("Escape"); // tutup picker
  }

  // ── Fill Create Form ───────────────────────────────────────────────────────

  /**
   * Set Location via underlying <select> langsung — lebih reliable dibanding
   * interact Select2 UI yang kadang bermasalah setelah Pikaday datepicker aktif.
   * Dispatch 'change' agar Livewire & Select2 display ikut terupdate.
   */
  async selectLocation(locationText: string) {
    await this.page.evaluate((text) => {
      const sel = document.querySelector("select#locationId") as HTMLSelectElement;
      if (!sel) return;
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].text.trim() === text) {
          sel.value = sel.options[i].value;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          break;
        }
      }
    }, locationText);

    // Berikan waktu Livewire untuk merespons event change
    await this.page.waitForTimeout(500);
  }

  async fillCreateForm(data: {
    date:        string;
    location:    string;
    auctionName: string;
    lotNumber:   string;
    lane:        string;
    auctionType: string;
    method:      string;
    startTimer:  string;
    resetTimer:  string;
    startTime:   string;
    eventType:   string;
  }) {
    // 1. Auction Date (Pikaday datepicker — fill langsung)
    await this.auctionDateInput.fill(data.date);
    await this.auctionDateInput.press("Escape"); // tutup datepicker kalau terbuka

    // 2. Location (via underlying select langsung — bypass Select2 UI)
    await this.selectLocation(data.location);

    // 3. Auction Name
    await this.auctionNameInput.fill(data.auctionName);

    // 4. Event Type (radio: sequence | listings)
    await this.page
      .locator(`input[name="event_type"][value="${data.eventType}"]`)
      .check();

    // 5. Auction No / Lot Number
    await this.lotNumberInput.fill(data.lotNumber);

    // 6. Lane
    await this.laneInput.fill(data.lane);

    // 7. Auction Type (plain select: private | public)
    await this.auctionTypeSelect.selectOption(data.auctionType);

    // 8. Method (plain select: online | on-site | mix)
    await this.auctionMethodSelect.selectOption(data.method);

    // 9. Start Timer
    await this.startTimerInput.clear();
    await this.startTimerInput.fill(data.startTimer);

    // 10. Reset Timer
    await this.resetTimerInput.clear();
    await this.resetTimerInput.fill(data.resetTimer);

    // 11. Start Time (Flatpickr — readonly, pakai JS API)
    await this.setFlatpickrTime(data.startTime);
  }

  async save() {
    await this.saveButton.click();
  }

  // ── List Actions ───────────────────────────────────────────────────────────

  /**
   * Klik detail auction berdasarkan nama auction yang tampil di tabel.
   * Link detail ada di kolom Auction ID atau Total Car List.
   */
  async clickDetailByName(auctionName: string) {
    await this.page
      .locator("tr")
      .filter({ hasText: auctionName })
      .locator('a[href*="auction/detail/vehicle-list"]')
      .first()
      .click();
    await this.page.waitForLoadState("networkidle");
  }

  // ── Detail Page: Add Vehicle ───────────────────────────────────────────────

  async clickAddCar() {
    await this.page.locator("#btn_add_vehicle").click();
    await this.page
      .locator("#modal-add-vehicle")
      .waitFor({ state: "visible", timeout: 10000 });
  }

  async searchVehicleInModal(keyword: string) {
    const modal = this.page.locator("#modal-add-vehicle");

    await modal
      .locator('input[wire\\:model\\.defer="search"]')
      .fill(keyword);
    await modal
      .locator('button:has-text("Search")')
      .click();

    // Tunggu hasil search muncul — Livewire butuh waktu untuk query & render
    await this.page
      .locator('#tbl-vehicle-add tbody tr')
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {}); // jika tidak ada hasil, lanjut saja
  }

  async selectFirstVehicleInModal() {
    await this.page
      .locator('#tbl-vehicle-add input[name="inventory_car_id"]')
      .first()
      .check();
  }

  async confirmAddVehicle(): Promise<"added" | "already_existed" | "no_vehicle"> {
    // Cek dulu apakah ada vehicle yang dipilih
    const checked = await this.page
      .locator('#tbl-vehicle-add input[name="inventory_car_id"]:checked')
      .count();
    if (checked === 0) return "no_vehicle";

    await this.page
      .locator('#modal-add-vehicle .btn-primary:has-text("Yes")')
      .click();

    // Tunggu sebentar untuk respons server
    await this.page.waitForTimeout(1500);

    // Cek apakah muncul notifikasi error "already existed"
    const errorNotif = this.page.locator(
      '.swal2-popup, .alert-danger, [class*="toast"], [class*="notification"]'
    ).filter({ hasText: /already existed|already exist/i });

    const hasError = await errorNotif.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasError) {
      // Dismiss notifikasi error (klik OK/confirm jika ada, atau tekan Escape)
      const confirmBtn = this.page.locator('.swal2-confirm, button:has-text("OK")');
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click();
      } else {
        await this.page.keyboard.press("Escape");
      }
      // Refresh page agar modal backdrop hilang
      await this.page.reload();
      await this.page.waitForLoadState("domcontentloaded");
      return "already_existed";
    }

    // Refresh page agar modal backdrop hilang dan halaman kembali bersih
    await this.page.reload();
    await this.page.waitForLoadState("domcontentloaded");
    return "added";
  }

  // ── Search Auction in List ─────────────────────────────────────────────────

  /**
   * Isi search field dan klik Search di halaman Auction List.
   * Livewire re-render tabel setelah search.
   */
  async searchAuction(keyword: string) {
    // Refresh halaman dulu agar Livewire component dalam state bersih
    await this.page.reload();
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.locator("#jadwallelang tbody").waitFor({ state: "visible", timeout: 15000 });

    const searchInput = this.page.locator('input.form-control[wire\\:model\\.defer="search"]');
    await searchInput.fill(keyword);

    const searchBtn = this.page.locator('button[wire\\:click\\.self="searchKeyword"]');
    await searchBtn.click();

    // Tunggu Livewire re-render
    await this.page.waitForTimeout(1500);
  }

  // ── Publish Auction ────────────────────────────────────────────────────────

  /**
   * Publish auction dari halaman list:
   *  1. Search dulu berdasarkan auctionName
   *  2. Centang checkbox "Publish" (name="isPublish_{uuid}") pada baris yang sesuai
   *     → Server fires showPublishedModal → muncul #publish-auction-modal → klik Close
   *  3. Centang checkbox "Publish Catalog" (name="isPublishCatalog_{uuid}")
   *     → Server fires showPublishedCatalogModal → muncul #publish-auction-catalog-modal → klik Close
   *
   * Selector berdasarkan HTML aktual:
   *   Publish:         input[name^="isPublish_"]:not([name^="isPublishCatalog_"])
   *   Publish Catalog: input[name^="isPublishCatalog_"]
   */
  async publishAuction(auctionName: string) {
    // 0. Search by auction name agar baris mudah ditemukan
    await this.searchAuction(auctionName);

    const row = this.page.locator("tr.tr").filter({ hasText: auctionName }).first();
    await row.waitFor({ state: "visible", timeout: 10000 });

    // ── 1. Publish checkbox ────────────────────────────────────────────────
    const publishCheckbox = row.locator('input[type="checkbox"][name^="isPublish_"]').first();

    const isAlreadyPublished = await publishCheckbox.isChecked().catch(() => false);
    if (!isAlreadyPublished) {
      await publishCheckbox.scrollIntoViewIfNeeded();
      await publishCheckbox.click();

      // Tunggu modal "Auction has been published!" muncul lalu tutup
      const publishModal = this.page.locator("#publish-auction-modal");
      await publishModal.waitFor({ state: "visible", timeout: 8000 });
      await publishModal.locator('button:has-text("Close")').click();
      await publishModal.waitFor({ state: "hidden", timeout: 5000 });
    }

    // ── 2. Publish Catalog checkbox ────────────────────────────────────────
    const catalogCheckbox = row.locator('input[type="checkbox"][name^="isPublishCatalog_"]').first();

    const isAlreadyCatalogPublished = await catalogCheckbox.isChecked().catch(() => false);
    if (!isAlreadyCatalogPublished) {
      await catalogCheckbox.scrollIntoViewIfNeeded();
      await catalogCheckbox.click();

      // Tunggu modal "Auction catalog has been published!" muncul lalu tutup
      const catalogModal = this.page.locator("#publish-auction-catalog-modal");
      await catalogModal.waitFor({ state: "visible", timeout: 8000 });
      await catalogModal.locator('button:has-text("Close")').click();
      await catalogModal.waitFor({ state: "hidden", timeout: 5000 });
    }
  }

  // ── Locator Helpers ────────────────────────────────────────────────────────

  getAuctionRow(auctionName: string): Locator {
    return this.page.locator("tr").filter({ hasText: auctionName });
  }

  getVehicleRowInDetail(licensePlate: string): Locator {
    return this.page.locator("tbody tr").filter({ hasText: licensePlate });
  }
}
