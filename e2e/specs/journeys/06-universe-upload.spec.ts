import { resolve } from "node:path";

import { expect, test, type BrowserContext } from "@playwright/test";

import { UniversePage } from "../../page-objects/universe.page";
import { getSupabaseAdmin } from "../../utils/db-helpers";
import { uniqueRunId } from "../../utils/test-data-factory";
import { getOrCreatePrimaryUser } from "../../utils/ui-finders";

const FIXTURE = resolve(__dirname, "../../fixtures/tiny-universe.xlsx");
const FIXTURE_BOND_COUNT = 3;

/**
 * Journey 06 — Universe-Upload.
 *
 * Lädt die Test-XLSX (3 Bonds) über die UI hoch, verifiziert dass die
 * Liste den bond_count zeigt und die DB das passende Record hält.
 */
test.describe.serial("Journey: Universe-Upload", () => {
  let context: BrowserContext;
  let profileId = "";
  const profileName = `Upload ${uniqueRunId()}`;

  test.beforeAll(async ({ browser }) => {
    const primary = await getOrCreatePrimaryUser(browser);
    context = await browser.newContext({ storageState: primary.authStatePath });
  });

  test.afterAll(async () => {
    await context?.close();
    if (profileId) {
      const admin = getSupabaseAdmin();
      await admin.from("universe_profiles").delete().eq("id", profileId);
    }
  });

  test("XLSX hochladen → Profil taucht in Liste mit korrektem bond_count auf", async () => {
    const page = await context.newPage();
    const universePage = new UniversePage(page);
    await universePage.goto();

    await universePage.openCreateDialog();
    await universePage.uploadXlsx(FIXTURE);
    await universePage.expectParsedBondCount(FIXTURE_BOND_COUNT);

    // Namensvorschlag aus Dateiname überschreiben.
    await universePage.fillName(profileName);
    await universePage.submit();

    profileId = await universePage.findIdByName(profileName);
    expect(profileId).toMatch(/^[0-9a-f-]{36}$/);

    // Row zeigt bond_count aus dem Parser.
    await expect(universePage.row(profileId)).toContainText(String(FIXTURE_BOND_COUNT));
    await expect(universePage.row(profileId)).toContainText("tiny-universe.xlsx");

    await page.close();
  });

  test("DB enthält Profil mit bonds-Payload und source_file", async () => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("universe_profiles")
      .select("name, bond_count, source_file, bonds")
      .eq("id", profileId)
      .single();
    expect(error).toBeNull();
    expect(data?.name).toBe(profileName);
    expect(data?.bond_count).toBe(FIXTURE_BOND_COUNT);
    expect(data?.source_file).toBe("tiny-universe.xlsx");
    expect(Array.isArray(data?.bonds)).toBe(true);
    expect((data?.bonds as unknown[]).length).toBe(FIXTURE_BOND_COUNT);

    // Spot-Check: Erste Bond-Zeile hat die Header-Spaltennamen als Keys.
    const first = (data?.bonds as Array<Record<string, unknown>>)[0];
    expect(first).toHaveProperty("ISIN");
    expect(first).toHaveProperty("Name");
    expect(first.ISIN).toBe("XS0000000001");
  });
});
