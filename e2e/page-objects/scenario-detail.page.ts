import { expect, type Locator } from "@playwright/test";

import { BasePage } from "./base.page";

/**
 * Page Object für die Scenario-Detail-Route
 * (/sessions/[id]/scenarios/[scenarioId]). Bond-Auswahl-Editor ist in
 * DRAFT-Status, Read-only-Liste in SAVED.
 */
export class ScenarioDetailPage extends BasePage {
  protected readonly path = "/sessions";

  async gotoIds(sessionId: string, scenarioId: string): Promise<void> {
    await this.page.goto(`/sessions/${sessionId}/scenarios/${scenarioId}`);
    await this.expectPageLoaded();
  }

  async expectPageLoaded(): Promise<void> {
    await expect(this.page.getByTestId("scenario-detail-page")).toBeVisible();
  }

  async expectStatus(label: "Entwurf" | "Gespeichert"): Promise<void> {
    await expect(this.page.getByTestId("scenario-detail-page")).toContainText(label);
  }

  bondRow(isin: string): Locator {
    return this.page.getByTestId(`bond-row-${isin}`);
  }

  async toggleBond(isin: string): Promise<void> {
    await this.page.getByTestId(`bond-checkbox-${isin}`).click();
  }

  async expectBondChecked(isin: string, checked: boolean): Promise<void> {
    const checkbox = this.page.getByTestId(`bond-checkbox-${isin}`);
    if (checked) await expect(checkbox).toBeChecked();
    else await expect(checkbox).not.toBeChecked();
  }

  async saveSelection(): Promise<void> {
    await this.page.getByTestId("bond-selector-save").click();
  }

  async expectReadonlyIsins(isins: string[]): Promise<void> {
    const list = this.page.getByTestId("bond-selector-readonly");
    await expect(list).toBeVisible();
    for (const isin of isins) {
      await expect(this.page.getByTestId(`bond-selected-${isin}`)).toBeVisible();
    }
  }

  async expectNoUniverseHint(): Promise<void> {
    await expect(this.page.getByTestId("scenario-no-universe")).toBeVisible();
  }
}
