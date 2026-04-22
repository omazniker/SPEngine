import { expect, test, type BrowserContext } from "@playwright/test";

import { UniverseDetailPage } from "../../page-objects/universe-detail.page";
import { createAuthenticatedClient, getSupabaseAdmin } from "../../utils/db-helpers";
import { uniqueRunId } from "../../utils/test-data-factory";
import { getOrCreatePrimaryUser } from "../../utils/ui-finders";

/**
 * Journey 08 — Universe-Detail + Delete + FK-Behavior.
 *
 * Prüft den kompletten Lesen-und-Löschen-Pfad:
 *   - Detail-Seite zeigt Metadaten + Bonds
 *   - Delete entfernt das Profil
 *   - Verknüpfte Session überlebt (ON DELETE SET NULL auf universe_profile_id)
 */
test.describe.serial("Journey: Universe-Detail + Delete", () => {
  let context: BrowserContext;
  let profileId = "";
  let sessionId = "";
  const profileName = `Detail-Test ${uniqueRunId()}`;
  const sessionName = `Session zu ${profileName}`;
  const bonds = [
    { ISIN: "XS0000000001", Name: "Bond Alpha", Coupon: 3.5 },
    { ISIN: "XS0000000002", Name: "Bond Beta", Coupon: 2.75 },
  ];

  test.beforeAll(async ({ browser }) => {
    const primary = await getOrCreatePrimaryUser(browser);
    context = await browser.newContext({ storageState: primary.authStatePath });

    const sb = await createAuthenticatedClient(primary.email, primary.password);

    const { data: uid, error: uErr } = await sb.rpc("create_universe_profile", {
      p_name: profileName,
      p_bonds: bonds,
      p_source_file: "journey-08.xlsx",
    });
    if (uErr) throw new Error(`create_universe_profile: ${uErr.message}`);
    if (typeof uid !== "string") throw new Error(`unerwarteter Typ: ${typeof uid}`);
    profileId = uid;

    // Session mit Verweis auf dieses Universum, damit wir den FK-Cleanup
    // (ON DELETE SET NULL) im Delete-Test verifizieren können.
    const { data: sid, error: sErr } = await sb.rpc("create_session", {
      p_name: sessionName,
      p_universe_profile_id: profileId,
    });
    if (sErr) throw new Error(`create_session: ${sErr.message}`);
    if (typeof sid !== "string") throw new Error(`unerwarteter Typ: ${typeof sid}`);
    sessionId = sid;
  });

  test.afterAll(async () => {
    await context?.close();
    const admin = getSupabaseAdmin();
    if (sessionId) await admin.from("sessions").delete().eq("id", sessionId);
    if (profileId) await admin.from("universe_profiles").delete().eq("id", profileId);
  });

  test("Detail-Seite zeigt Metadaten + alle Bonds", async () => {
    const page = await context.newPage();
    const detail = new UniverseDetailPage(page);
    await detail.gotoId(profileId);

    await expect(page.getByTestId("universe-detail-id")).toContainText(profileId);
    await detail.expectBondCount(bonds.length);
    await detail.expectSource("journey-08.xlsx");

    // Bond-Tabelle rendert alle Zeilen.
    await detail.expectBondsTableHasRows(bonds.length);
    // Header-Spalten sind in den Rows sichtbar.
    await expect(detail.bondsRow(0)).toContainText("XS0000000001");
    await expect(detail.bondsRow(0)).toContainText("Bond Alpha");
    await expect(detail.bondsRow(1)).toContainText("Bond Beta");

    await page.close();
  });

  test("Delete entfernt das Profil, Session verliert nur die Verknüpfung", async () => {
    const page = await context.newPage();
    const detail = new UniverseDetailPage(page);
    await detail.gotoId(profileId);

    await detail.deleteUniverse();
    // Navigation zurück zur Liste.
    await expect(page).toHaveURL(/\/universe$/);
    await page.close();

    const admin = getSupabaseAdmin();

    // Universum ist weg.
    const { data: universeAfter } = await admin
      .from("universe_profiles")
      .select("id")
      .eq("id", profileId)
      .maybeSingle();
    expect(universeAfter).toBeNull();

    // Session existiert noch, universe_profile_id wurde auf NULL gesetzt.
    const { data: sessionAfter, error } = await admin
      .from("sessions")
      .select("id, universe_profile_id")
      .eq("id", sessionId)
      .single();
    expect(error).toBeNull();
    expect(sessionAfter?.universe_profile_id).toBeNull();

    // afterAll muss das Profil nicht mehr abräumen.
    profileId = "";
  });
});
