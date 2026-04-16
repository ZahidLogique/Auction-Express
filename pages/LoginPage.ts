import { Page, Locator } from "@playwright/test";

// --- BACKOFFICE ---
export class BackofficeLoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly languageSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.languageSelect = page.locator('select[name="language"]');
  }

  async login(user: string, pass: string) {
    if (await this.languageSelect.isVisible()) {
      await this.languageSelect.selectOption("en");
    }
    await this.usernameInput.fill(user);
    await this.passwordInput.fill(pass);
    await this.loginButton.click();
  }
}

// --- AUCTION ---
export class AuctionLoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly termsCheckbox: Locator;
  readonly enLanguageBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.locator('button').filter({ hasText: /Login|เข้าสู่ระบบ|Sign In/i }).last();
    this.termsCheckbox = page.locator('input[type="checkbox"]').first();
    this.enLanguageBtn = page.getByRole('button', { name: /English|ภาษาอังกฤษ/i });
  }

  async login(user: string, pass: string) {
    // Pastikan bahasa English sebelum lanjut
    const isThai = await this.page.locator('text=เลือกภาษา').isVisible();
    if (isThai) {
      const enBtn = this.page.getByText('English');
      if (await enBtn.isVisible()) {
        await enBtn.click();
        await this.page.waitForTimeout(1000);
      }
    }
    await this.emailInput.fill(user);
    await this.emailInput.press('Tab');
    await this.passwordInput.fill(pass);
    await this.passwordInput.press('Tab');
    
    if (await this.termsCheckbox.isVisible()) {
      // Menggunakan .check() untuk elemen input checkbox
      await this.termsCheckbox.check({ force: true });
    }
    
    await this.loginButton.click();
  }
}

// --- CONDUCTOR ---
export class ConductorLoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly languageDropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    // Mencari tombol login dengan teks atau tipe submit
    this.loginButton = page.locator('button').filter({ hasText: /Login|เข้าสู่ระบบ|Sign In/i }).last();
    // Selektor dropdown bahasa berdasarkan snapshot
    this.languageDropdown = page.locator('div').filter({ hasText: /^English$|^ภาษาอังกฤษ$/i }).last();
  }

  async login(user: string, pass: string) {
    // Pastikan bahasa English sebelum lanjut
    const isThai = await this.page.locator('text=เลือกภาษา').isVisible();
    if (isThai) {
      // Klik dropdown/tombol bahasa untuk memunculkan pilihan (jika perlu) atau langsung klik tombol English
      const enBtn = this.page.getByText('English');
      if (await enBtn.isVisible()) {
        await enBtn.click();
        await this.page.waitForTimeout(1000);
      }
    }

    await this.emailInput.fill(user);
    await this.passwordInput.fill(pass);
    await this.loginButton.click();
  }
}

// Alias untuk kompatibilitas jika masih ada yang memanggil LoginPage secara generic
export { BackofficeLoginPage as LoginPage };
