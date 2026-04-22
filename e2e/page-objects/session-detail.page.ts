import { expect } from "@playwright/test";

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
}
