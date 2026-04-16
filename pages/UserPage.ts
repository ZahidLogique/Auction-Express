import { Page, Locator } from "@playwright/test";

export class UserPage {
  readonly page: Page;

  // ── List Page ─────────────────────────────────────────────────────────────
  readonly addUserButton: Locator;
  readonly searchInput:   Locator;
  readonly searchButton:  Locator;

  // ── Add User Modal ─────────────────────────────────────────────────────────
  readonly usernameInput:        Locator;
  readonly fullNameInput:        Locator;
  readonly emailInput:           Locator;
  readonly positionsInput:       Locator;
  readonly phoneInput:           Locator;
  readonly passwordInput:        Locator;
  readonly passwordConfirmInput: Locator;
  readonly addSaveButton:        Locator;

  // ── Edit User Modal ────────────────────────────────────────────────────────
  readonly editFullNameInput: Locator;
  readonly editSaveButton:    Locator;

  // ── Delete Confirmation Modal ──────────────────────────────────────────────
  readonly deleteConfirmButton: Locator;

  // ── Response ──────────────────────────────────────────────────────────────
  readonly toastSuccess: Locator;

  constructor(page: Page) {
    this.page = page;

    // List page
    this.addUserButton = page.locator('button.btn-success[data-toggle="modal"]');
    this.searchInput   = page.locator('input[placeholder="Keyword..."]');
    this.searchButton  = page.locator('button[wire\\:click="searchData"]');

    // Add User Modal — semua pakai ID unik
    this.usernameInput        = page.locator('#username');
    this.fullNameInput        = page.locator('#full_name');
    this.emailInput           = page.locator('#email');
    this.positionsInput       = page.locator('#jabatan');
    this.phoneInput           = page.locator('#phone_number');
    this.passwordInput        = page.locator('#password');
    this.passwordConfirmInput = page.locator('#password_confirmation');
    this.addSaveButton        = page.locator('#add-user-modal button[type="submit"]');

    // Edit User Modal
    this.editFullNameInput = page.locator('#e-full-name');
    this.editSaveButton    = page.locator('#edit-user-modal button[type="submit"]');

    // Delete confirmation
    this.deleteConfirmButton = page.locator('#delete-user-modal button[type="submit"]');

    // Success notification
    this.toastSuccess = page.locator('.alert-success').first();
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto("/en/user-management/users");
  }

  // ── List Page Actions ─────────────────────────────────────────────────────

  async openAddUserModal() {
    await this.addUserButton.click();
    await this.usernameInput.waitFor({ state: "visible" });
  }

  /** Cari user: isi keyword lalu klik tombol Search */
  async searchUser(username: string) {
    await this.searchInput.fill(username);
    await this.searchButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  /** Locator baris tabel yang mengandung username */
  getRow(username: string): Locator {
    return this.page
      .locator("#tbl-user tbody tr")
      .filter({ hasText: username });
  }

  /** Klik tombol Edit (kuning) pada baris user yang dicari */
  async clickEditInRow(username: string) {
    await this.getRow(username)
      .locator('button.btn-warning[title="Edit User"]')
      .click();
    await this.editFullNameInput.waitFor({ state: "visible" });
  }

  /** Klik tombol Delete (merah) pada baris user yang dicari */
  async clickDeleteInRow(username: string) {
    await this.getRow(username)
      .locator('button.btn-danger[title="Remove User"]')
      .click();
    await this.deleteConfirmButton.waitFor({ state: "visible" });
  }

  /** Konfirmasi hapus */
  async confirmDelete() {
    await this.deleteConfirmButton.click();
  }

  // ── Form Actions ──────────────────────────────────────────────────────────

  /** Pilih opsi di Select2 dropdown berdasarkan ID container dan label teks */
  async selectSelect2(containerId: string, optionText: string) {
    // Klik visible Select2 container untuk buka dropdown
    await this.page.locator(`#${containerId}`).click();
    // Tunggu dropdown muncul dan stabil
    const option = this.page
      .locator(".select2-results__option")
      .filter({ hasText: optionText })
      .first();
    await option.waitFor({ state: "visible" });
    await option.click();
  }

  async fillForm(data: {
    username: string;
    fullName: string;
    email:    string;
    role:     string;
    position: string;
    phone:    string;
    password: string;
  }) {
    // ── Step 1: Role (wire:model LIVE) via Select2 → triggers Livewire re-render
    await this.page.locator("#role_id").selectOption({ label: data.role }, { force: true });
    await this.page.waitForLoadState("networkidle");

    // ── Step 2: Set ALL remaining fields via Livewire JS API in one batch ──────
    // Multiple synchronous set() calls are batched by Livewire into ONE request,
    // so there is only one re-render — eliminating the race-condition where
    // sequential dispatchEvent / fill calls clear each other's values.
    await this.page.evaluate(
      (params: {
        username: string; fullName: string; email: string;
        position: string; phone: string; password: string;
      }) => {
        // ── Find the Livewire component that owns the Add User modal form ────
        const anchor = document.querySelector("#username") as Element | null;
        let node: Element | null = anchor;
        while (node && !node.hasAttribute("wire:id")) {
          node = node.parentElement;
        }
        const componentId = node?.getAttribute("wire:id");
        if (!componentId) throw new Error("Livewire component not found");

        // Support both Livewire 2 (window.livewire) and 3 (window.Livewire)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lw = (window as any).Livewire ?? (window as any).livewire;
        const comp = lw.find(componentId);

        // ── Read Bangna's UUID from the #location_id select ──────────────────
        const locSelect = document.querySelector(
          "#location_id"
        ) as HTMLSelectElement | null;
        const bangnaVal = locSelect
          ? Array.from(locSelect.options).find((o) =>
              o.text.trim() === "Bangna"
            )?.value ?? ""
          : "";

        // ── Batch all set() calls synchronously so Livewire sends one request ─
        comp.set("item.status",              "1");           // Active
        comp.set("item.location_id",         bangnaVal ? [bangnaVal] : []);
        comp.set("item.is_satellite",        "1");           // No
        comp.set("item.jabatan",             params.position);
        comp.set("item.phone_number",        params.phone);
        comp.set("item.username",            params.username);
        comp.set("item.full_name",           params.fullName);
        comp.set("item.email",               params.email);
        comp.set("item.password",            params.password);
        comp.set("item.password_confirmation", params.password);
      },
      {
        username: data.username,
        fullName: data.fullName,
        email:    data.email,
        position: data.position,
        phone:    data.phone,
        password: data.password,
      }
    );

    // Wait for Livewire to finish processing the batched set() calls
    await this.page.waitForLoadState("networkidle");
  }

  async submit() {
    await this.addSaveButton.click();
  }

  async submitEdit() {
    await this.editSaveButton.click();
  }
}
