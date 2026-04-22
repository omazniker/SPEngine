import { expect, type Locator } from "@playwright/test";

import { BasePage } from "./base.page";

/**
 * Page Object für die Universe-Detail-Seite (/universe/[id]). Zeigt Metadaten
 * + Bond-Tabelle + Delete-Button (mit AlertDialog).
 */
export class UniverseDetailPage extends BasePage {
  protected readonly path = "/universe";

  async gotoId(id: string): Promise<void> {
    await this.page.goto(`/universe/${id}`);
    await this.expectPageLoaded();
  }

  async expectPageLoaded(): Promise<void> {
    await expect(this.page.getByTestId("universe-detail-page")).toBeVisible();
  }

  async expectBondCount(count: number): Promise<void> {
    await expect(this.page.getByTestId("universe-detail-bond-count")).toContainText(
      String(count),
    );
  }

  async expectSource(fileName: string): Promise<void> {
    await expect(this.page.getByTestId("universe-detail-source")).toContainText(fileName);
  }

  bondsRow(index: number): Locator {
    return this.page.getByTestId(`bonds-row-${index}`);
  }

  async expectBondsTableHasRows(count: number): Promise<void> {
    // DataTable rendert `bonds-row-{index}` für jede Zeile.
    await expect(this.page.getByTestId(`bonds-row-${count - 1}`)).toBeVisible();
  }

  async toggleDefault(): Promise<void> {
    await this.page.getByTestId("universe-detail-toggle-default").click();
  }

  async expectIsDefault(isDefault: boolean): Promise<void> {
    const button = this.page.getByTestId("universe-detail-toggle-default");
    if (isDefault) await expect(button).toContainText("Standard");
    else await expect(button).toContainText("Als Standard markieren");
  }

  async deleteUniverse(): Promise<void> {
    // Delete-Button aus dem Header, nicht aus einem Row-Menu — braucht kein
    // Keyboard-Workaround, aber Radix' AlertDialog-Confirm-Button ist wieder
    // Portal-basiert. Bisher haben Universum-Delete-Tests keinen Flake gezeigt,
    // aber falls ja: gleicher Keyboard-Trick wie bei Row-Menus.
    await this.page.getByTestId("universe-detail-delete-button").click();
    await expect(this.page.getByTestId("universe-detail-delete-dialog")).toBeVisible();
    await this.page.getByTestId("universe-detail-delete-confirm").click();
  }
}
