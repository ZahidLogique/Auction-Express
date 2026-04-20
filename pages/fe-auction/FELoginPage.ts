import { Page, Locator } from "@playwright/test";

export class FELoginPage {
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
      await this.termsCheckbox.check({ force: true });
    }

    await this.loginButton.click();
  }
}

// Alias untuk kompatibilitas dengan import lama (AuctionLoginPage)
export { FELoginPage as AuctionLoginPage };
