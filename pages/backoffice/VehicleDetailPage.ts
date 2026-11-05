import { Page, Locator, expect } from "@playwright/test";

/**
 * Halaman Detail / Edit kendaraan (Back Office) — bagian yang diubah tiket AE-487:
 * floating action bar (.ae-action-bar) dan panel Activity Log (#ae-activity-drawer).
 * Sengaja terpisah dari VehiclePage (form create & list).
 */
export class VehicleDetailPage {
  readonly page: Page;

  readonly actionBar: Locator;
  readonly activityDrawer: Locator;
  readonly activityList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.actionBar = page.locator(".ae-action-bar");
    this.activityDrawer = page.locator("#ae-activity-drawer");
    this.activityList = page.locator("#ae-activity-list");
  }

  // ── Action bar ─────────────────────────────────────────────────────────────

  barButton(name: string): Locator {
    return this.actionBar.getByText(name, { exact: true }).first();
  }

  async waitForActionBar() {
    await this.page.waitForLoadState("domcontentloaded");
    await expect(this.actionBar).toBeVisible({ timeout: 60000 });
  }

  async expectBarButtons(names: string[]) {
    for (const name of names) {
      await expect(this.barButton(name), `tombol "${name}" tampil di bar`).toBeVisible();
    }
  }

  async expectBarHasNoButton(name: string) {
    await expect(this.actionBar.getByText(name, { exact: true }), `tombol "${name}" tidak ada di bar`)
      .toHaveCount(0);
  }

  async clickBarButton(name: string) {
    await this.barButton(name).click();
  }

  /** Scroll halaman ke paling bawah. Memastikan halaman benar-benar bisa di-scroll agar tes tidak lolos semu. */
  async scrollToBottom() {
    const scrollable = await this.page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight
    );
    expect(scrollable, "halaman cukup panjang untuk di-scroll").toBeGreaterThan(0);
    await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => this.page.evaluate(() => window.scrollY), {
      message: "halaman ter-scroll ke bawah",
    }).toBeGreaterThan(0);
  }

  async scrollToTop() {
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => this.page.evaluate(() => window.scrollY), {
      message: "halaman kembali ke atas",
    }).toBe(0);
  }

  /** Bar terlihat di dalam viewport (dipakai di posisi scroll paling atas, di mana bar ada di posisi normalnya). */
  async expectBarInViewport() {
    await expect(this.actionBar).toBeInViewport();
  }

  /** Bar menempel di dekat bagian atas viewport (top 0–100px) saat halaman di-scroll, bukan ikut terdorong ke bawah. */
  async expectBarNearTop() {
    await expect(this.actionBar).toBeInViewport();
    await expect.poll(
      async () => {
        const box = await this.actionBar.boundingBox();
        return box !== null && box.y >= 0 && box.y < 100;
      },
      { message: "bar berada di dekat bagian atas viewport" }
    ).toBe(true);
  }

  // ── Activity Log ───────────────────────────────────────────────────────────

  /** Klik Activity Log lalu tunggu panel terbuka dan data log selesai diminta ke server. */
  async openActivityLog() {
    await expect(this.activityDrawer).not.toBeInViewport();
    const logResponse = this.page.waitForResponse(
      (r) => /\/vehicle\/car\/activity-log\//.test(r.url()),
      { timeout: 30000 }
    );
    await this.clickBarButton("Activity Log");
    await expect(this.activityDrawer).toBeInViewport({ timeout: 15000 });
    await logResponse;
  }

  async expectFilterControls() {
    const d = this.activityDrawer;
    await expect(d.getByLabel("Start date")).toBeVisible();
    await expect(d.getByLabel("End date")).toBeVisible();
    await expect(d.getByLabel("User")).toBeVisible();
    await expect(d.getByLabel("Field Changed")).toBeVisible();
    await expect(d.getByRole("button", { name: "Filter", exact: true })).toBeVisible();
    await expect(d.getByRole("button", { name: "Clear", exact: true })).toBeVisible();
  }

  /** Daftar entri (atau pesan kosong) tampil dan tidak ada pesan gagal memuat. */
  async expectLogLoadedWithoutError() {
    await expect(this.activityList).toBeVisible();
    await expect(this.activityList).not.toBeEmpty();
    await expect(this.activityDrawer).not.toContainText(/could not load/i);
  }
}
