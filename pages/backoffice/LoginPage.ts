import { Page, Locator } from "@playwright/test";

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
      // Tunggu page reload setelah ganti bahasa
      await this.page.waitForLoadState("domcontentloaded");
      await this.page.waitForTimeout(500);
    }
    await this.usernameInput.waitFor({ state: "visible", timeout: 10000 });
    await this.usernameInput.fill(user);
    await this.passwordInput.fill(pass);
    await this.loginButton.click();
  }
}

// Alias untuk kompatibilitas
export { BackofficeLoginPage as LoginPage };
