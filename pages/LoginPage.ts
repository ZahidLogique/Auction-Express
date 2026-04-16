import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly usernameInput:  Locator;
  readonly passwordInput:  Locator;
  readonly loginButton:    Locator;
  readonly languageSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput  = page.locator('input[name="username"]');
    this.passwordInput  = page.locator('input[name="password"]');
    this.loginButton    = page.locator('button[type="submit"]');
    this.languageSelect = page.locator('select[name="language"]');
  }

  async goto() {
    await this.page.goto("/");
  }

  async selectLanguage(lang: "en" | "th" = "en") {
    await this.languageSelect.selectOption(lang);
  }

  async login(username: string, password: string) {
    await this.selectLanguage("en");
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
