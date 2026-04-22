import { expect, type Locator } from "@playwright/test";

import { BasePage } from "./base.page";

/**
 * Page Object für die Universe-Liste (/universe). Create-Dialog mit optionalem
 * XLSX-Upload — wenn keine Datei gewählt wird, entsteht ein leerer Snapshot.
 */
export class UniversePage extends BasePage {
  protected readonly path = "/universe";

  async expectPageLoaded(): Promise<void> {
    await expect(this.page.getByTestId("universe-page")).toBeVisible();
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId("universe-create-button").click();
    await expect(this.page.getByTestId("universe-create-dialog")).toBeVisible();
  }

  async uploadXlsx(filePath: string): Promise<void> {
    await this.page.getByTestId("universe-create-file-input").setInputFiles(filePath);
    // Warten, bis die Parse-Preview da ist — sonst kann der Submit rausgehen
    // bevor der ExcelJS-Parse-Promise fertig ist.
    await expect(this.page.getByTestId("universe-create-parse-preview")).toBeVisible();
  }

  async expectParsedBondCount(count: number): Promise<void> {
    await expect(this.page.getByTestId("universe-create-parse-preview")).toContainText(
      String(count),
    );
  }

  async fillName(name: string): Promise<void> {
    await this.page.getByTestId("universe-create-name-input").fill(name);
  }

  async submit(): Promise<void> {
    await this.page.getByTestId("universe-create-submit").click();
    await expect(this.page.getByTestId("universe-create-dialog")).toBeHidden();
  }

  /**
   * Sucht die neu erzeugte Row nach Name (Create-Action liefert keine ID an
   * den Client zurück). Liest das `universe-row-{id}`-data-testid aus dem DOM.
   */
  async findIdByName(name: string): Promise<string> {
    const row = this.page
      .locator('[data-testid^="universe-row-"]')
      .filter({ hasText: name });
    await expect(row, `Universe-Row mit Name "${name}" muss sichtbar sein`).toBeVisible();
    const testId = await row.getAttribute("data-testid");
    if (!testId) throw new Error(`Row für Universe "${name}" hat kein data-testid`);
    return testId.replace("universe-row-", "");
  }

  row(id: string): Locator {
    return this.page.getByTestId(`universe-row-${id}`);
  }
}
