import { expect } from "@playwright/test";

import { BasePage } from "./base.page";

export class SignupPage extends BasePage {
  protected readonly path = "/signup";

  async expectPageLoaded(): Promise<void> {
    await expect(this.getByTestId("signup-page")).toBeVisible();
  }

  async signup(params: { email: string; password: string; company?: string }): Promise<void> {
    await this.getByTestId("signup-email-input").fill(params.email);
    await this.getByTestId("signup-password-input").fill(params.password);
    if (params.company) {
      await this.getByTestId("signup-company-input").fill(params.company);
    }
    await this.getByTestId("signup-submit-button").click();
    // Nach Erfolg: entweder /login?confirm=1 (Email-Confirmation aktiv) oder /.
    await this.page.waitForURL((url) => !url.pathname.startsWith("/signup"));
  }
}
