import { expect, type Locator } from "@playwright/test";

import { BasePage } from "./base.page";

/**
 * Page Object für die Sessions-Liste (/sessions) inklusive Create-Dialog und
 * Row-Actions (archive / restore / delete mit AlertDialog-Bestätigung).
 */
export class SessionsPage extends BasePage {
  protected readonly path = "/sessions";

  async expectPageLoaded(): Promise<void> {
    await expect(this.page.getByTestId("sessions-page")).toBeVisible();
  }

  /**
   * Öffnet den Create-Dialog, gibt Namen (und optional Universe-Profil-ID) ein,
   * submit. Navigiert anschließend automatisch auf /sessions/[newId]
   * (siehe create-session-button.tsx).
   */
  async createSession(name: string, universeProfileId?: string): Promise<void> {
    await this.page.getByTestId("sessions-create-button").click();
    await expect(this.page.getByTestId("sessions-create-dialog")).toBeVisible();
    await this.page.getByTestId("session-create-name-input").fill(name);
    if (universeProfileId !== undefined) {
      await this.page
        .getByTestId("session-create-universe-select")
        .selectOption(universeProfileId);
    }
    await this.page.getByTestId("session-create-submit").click();
  }

  row(id: string): Locator {
    return this.page.getByTestId(`sessions-row-${id}`);
  }

  async openRowMenu(id: string): Promise<void> {
    await this.page.getByTestId(`sessions-row-actions-${id}`).click();
    await expect(this.page.getByTestId(`sessions-row-menu-${id}`)).toBeVisible();
  }

  async archiveRow(id: string): Promise<void> {
    await this.openRowMenu(id);
    await this.page.getByTestId(`sessions-archive-${id}`).click();
  }

  async restoreRow(id: string): Promise<void> {
    await this.openRowMenu(id);
    await this.page.getByTestId(`sessions-restore-${id}`).click();
  }

  async deleteRow(id: string): Promise<void> {
    await this.openRowMenu(id);
    await this.page.getByTestId(`sessions-delete-${id}`).click();
    await expect(this.page.getByTestId(`sessions-delete-dialog-${id}`)).toBeVisible();
    await this.page.getByTestId(`sessions-delete-confirm-${id}`).click();
  }

  async expectRowStatus(id: string, label: "Aktiv" | "Archiviert"): Promise<void> {
    await expect(this.row(id)).toContainText(label);
  }

  async expectRowMissing(id: string): Promise<void> {
    await expect(this.row(id)).toHaveCount(0);
  }
}
