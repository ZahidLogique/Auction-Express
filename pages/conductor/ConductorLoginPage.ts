import { Page, Locator } from "@playwright/test";

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
    this.loginButton = page.locator('button').filter({ hasText: /Login|เข้าสู่ระบบ|Sign In/i }).last();
    this.languageDropdown = page.locator('div').filter({ hasText: /^English$|^ภาษาอังกฤษ$/i }).last();
  }

  async login(user: string, pass: string) {
    const isThai = await this.page.locator('text=เลือกภาษา').isVisible();
    if (isThai) {
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
