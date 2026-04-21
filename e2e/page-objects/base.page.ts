import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Basisklasse für alle Page Objects. Jedes Page Object MUSS davon erben und
 * `path` + `expectPageLoaded()` setzen. `data-testid` ist der bevorzugte Selektor.
 */
export abstract class BasePage {
  protected readonly page: Page;
  protected abstract readonly path: string;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.expectPageLoaded();
  }

  abstract expectPageLoaded(): Promise<void>;

  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  async expectToast(message: string | RegExp): Promise<void> {
    const toast = this.page.getByTestId("toast").filter({ hasText: message });
    await expect(toast).toBeVisible();
  }
}
