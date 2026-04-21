import { expect } from "@playwright/test";

import { BasePage } from "./base.page";

/**
 * Skelett für die Login-Seite. Sobald `/login` existiert, die tatsächlichen
 * data-testid-Selektoren füllen (`login-email-input`, `login-password-input`,
 * `login-submit-button`).
 */
export class LoginPage extends BasePage {
  protected readonly path = "/login";

  async expectPageLoaded(): Promise<void> {
    await expect(this.getByTestId("login-page")).toBeVisible();
  }

  async login(email: string, password: string): Promise<void> {
    await this.getByTestId("login-email-input").fill(email);
    await this.getByTestId("login-password-input").fill(password);
    await this.getByTestId("login-submit-button").click();
    await this.page.waitForURL((url) => !url.pathname.startsWith("/login"));
  }
}
