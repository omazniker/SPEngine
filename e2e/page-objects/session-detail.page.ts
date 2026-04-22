import { expect, type Locator } from "@playwright/test";

import { BasePage } from "./base.page";

/**
 * Page Object für die Session-Detail-Seite (/sessions/[id]).
 * Die `path`-Basis wird mit `gotoId` dynamisch vervollständigt — `goto()`
 * (ohne ID) hat auf dieser Route keinen sinnvollen Einsatz.
 */
export class SessionDetailPage extends BasePage {
  protected readonly path = "/sessions";

  async gotoId(id: string): Promise<void> {
    await this.page.goto(`/sessions/${id}`);
    await this.expectPageLoaded();
  }

  async expectPageLoaded(): Promise<void> {
    await expect(this.page.getByTestId("session-detail-page")).toBeVisible();
  }

  /**
   * Liest die Session-ID aus der URL der aktuell geladenen Detail-Seite.
   * Nützlich nach `SessionsPage.createSession`, weil der Server-Action-Flow
   * automatisch auf /sessions/[newId] redirected.
   */
  readIdFromUrl(): string {
    const match = this.page.url().match(/\/sessions\/([0-9a-f-]{36})(?:\/|$|\?)/);
    if (!match) {
      throw new Error(`Aktuelle URL enthält keine Session-ID: ${this.page.url()}`);
    }
    return match[1];
  }

  async expectSessionId(id: string): Promise<void> {
    await expect(this.page.getByTestId("session-detail-id")).toContainText(id);
  }

  // ---------- Scenario-Interaktionen ----------
  //
  // Scenarios werden auf der Session-Detail-Seite erstellt, gespeichert und
  // gelöscht. Anders als Sessions gibt es keinen Redirect nach Create — der
  // Dialog schließt sich, die Liste refresht, die neue Row erscheint.

  async createScenario(name: string): Promise<void> {
    await this.page.getByTestId("scenarios-create-button").click();
    await expect(this.page.getByTestId("scenarios-create-dialog")).toBeVisible();
    await this.page.getByTestId("scenario-create-name-input").fill(name);
    await this.page.getByTestId("scenario-create-submit").click();
    await expect(this.page.getByTestId("scenarios-create-dialog")).toBeHidden();
  }

  /**
   * Sucht die neu erzeugte Scenario-Row nach Name (Create liefert keine ID zurück).
   * Liest das `scenarios-row-{id}`-data-testid aus dem DOM. Nutzt locator() weil
   * ein Prefix-Selector ohne bekannte ID über `getByTestId` nicht geht — das ist
   * der einzige legitime locator()-Einsatz und findet sich im Page Object, nicht
   * im Spec.
   */
  async findScenarioIdByName(name: string): Promise<string> {
    const row = this.page
      .locator('[data-testid^="scenarios-row-"]')
      .filter({ hasText: name });
    await expect(row, `Scenario-Row mit Name "${name}" muss sichtbar sein`).toBeVisible();
    const testId = await row.getAttribute("data-testid");
    if (!testId) throw new Error(`Row für Scenario "${name}" hat kein data-testid`);
    return testId.replace("scenarios-row-", "");
  }

  scenarioRow(id: string): Locator {
    return this.page.getByTestId(`scenarios-row-${id}`);
  }

  async openScenarioRowMenu(id: string): Promise<void> {
    // Via Keyboard triggern, nicht Mouse-Click (siehe SessionsPage.openRowMenu
    // für die ausführliche Erklärung).
    const trigger = this.page.getByTestId(`scenarios-row-actions-${id}`);
    await trigger.focus();
    await this.page.keyboard.press("Enter");
    await expect(this.page.getByTestId(`scenarios-row-menu-${id}`)).toBeVisible();
  }

  async saveScenarioRow(id: string): Promise<void> {
    await this.openScenarioRowMenu(id);
    await this.page.getByTestId(`scenarios-save-${id}`).click();
  }

  async deleteScenarioRow(id: string): Promise<void> {
    await this.openScenarioRowMenu(id);
    await this.page.getByTestId(`scenarios-delete-${id}`).click();
    // Dropdown-Menu schließt mit Animation — zuerst auf zu warten, dann erst
    // den AlertDialog-Confirm-Button anfassen. Sonst klickt Playwright den
    // Confirm-Button während das Menu-Portal noch aus dem DOM rausräumt, was
    // zu "element detached"-Fehlern führt.
    await expect(this.page.getByTestId(`scenarios-row-menu-${id}`)).toBeHidden();
    await expect(this.page.getByTestId(`scenarios-delete-dialog-${id}`)).toBeVisible();
    await this.page.getByTestId(`scenarios-delete-confirm-${id}`).click();
  }

  async expectScenarioStatus(id: string, label: "Entwurf" | "Gespeichert"): Promise<void> {
    await expect(this.scenarioRow(id)).toContainText(label);
  }

  async expectScenarioMissing(id: string): Promise<void> {
    await expect(this.scenarioRow(id)).toHaveCount(0);
  }
}
