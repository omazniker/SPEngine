import { expect, test, type BrowserContext } from "@playwright/test";

import { ScenarioDetailPage } from "../../page-objects/scenario-detail.page";
import { createAuthenticatedClient, getSupabaseAdmin } from "../../utils/db-helpers";
import { uniqueRunId } from "../../utils/test-data-factory";
import { getOrCreatePrimaryUser } from "../../utils/ui-finders";

/**
 * Journey 09 — Scenario-Config mit Bond-Auswahl aus dem Session-Universum.
 *
 * Seed via RPCs (Universe + Session + DRAFT-Scenario), dann über die UI zwei
 * Bonds auswählen, speichern, DB-Check auf `scenarios.config.selectedIsins`.
 * Read-only-Pfad für SAVED-Scenarios wird separat geprüft.
 */
test.describe.serial("Journey: Scenario-Config (Bond-Auswahl)", () => {
  let context: BrowserContext;
  let universeId = "";
  let sessionId = "";
  let scenarioId = "";
  const universeName = `BondConfig-Universe ${uniqueRunId()}`;
  const sessionName = `BondConfig-Session ${uniqueRunId()}`;
  const bonds = [
    { ISIN: "XS-CFG-001", Name: "Alpha", Coupon: 3.25 },
    { ISIN: "XS-CFG-002", Name: "Beta", Coupon: 2.5 },
    { ISIN: "XS-CFG-003", Name: "Gamma", Coupon: 4.0 },
  ];

  test.beforeAll(async ({ browser }) => {
    const primary = await getOrCreatePrimaryUser(browser);
    context = await browser.newContext({ storageState: primary.authStatePath });

    const sb = await createAuthenticatedClient(primary.email, primary.password);

    const { data: uid, error: uErr } = await sb.rpc("create_universe_profile", {
      p_name: universeName,
      p_bonds: bonds,
    });
    if (uErr) throw new Error(`create_universe_profile: ${uErr.message}`);
    universeId = uid as string;

    const { data: sid, error: sErr } = await sb.rpc("create_session", {
      p_name: sessionName,
      p_universe_profile_id: universeId,
    });
    if (sErr) throw new Error(`create_session: ${sErr.message}`);
    sessionId = sid as string;

    const { data: scid, error: scErr } = await sb.rpc("create_scenario", {
      p_session_id: sessionId,
      p_name: "Config-Scenario",
    });
    if (scErr) throw new Error(`create_scenario: ${scErr.message}`);
    scenarioId = scid as string;
  });

  test.afterAll(async () => {
    await context?.close();
    const admin = getSupabaseAdmin();
    // Session-Delete cascaded Scenario; Universe separat.
    if (sessionId) await admin.from("sessions").delete().eq("id", sessionId);
    if (universeId) await admin.from("universe_profiles").delete().eq("id", universeId);
  });

  test("DRAFT-Scenario: zwei Bonds auswählen + speichern", async () => {
    const page = await context.newPage();
    const detail = new ScenarioDetailPage(page);
    await detail.gotoIds(sessionId, scenarioId);
    await detail.expectStatus("Entwurf");

    // Alle drei Bond-Rows erscheinen, keine ist initial geprüft.
    for (const bond of bonds) {
      await expect(detail.bondRow(bond.ISIN)).toBeVisible();
      await detail.expectBondChecked(bond.ISIN, false);
    }

    await detail.toggleBond("XS-CFG-001");
    await detail.toggleBond("XS-CFG-003");
    await detail.saveSelection();

    // Nach Save bleibt der Editor sichtbar, Checkboxes zeigen den Zustand.
    await detail.expectBondChecked("XS-CFG-001", true);
    await detail.expectBondChecked("XS-CFG-002", false);
    await detail.expectBondChecked("XS-CFG-003", true);

    await page.close();
  });

  test("DB hat die Auswahl als config.selectedIsins gespeichert", async () => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("scenarios")
      .select("config")
      .eq("id", scenarioId)
      .single();
    expect(error).toBeNull();
    const config = data?.config as { selectedIsins?: string[] } | null;
    expect(config?.selectedIsins).toEqual(["XS-CFG-001", "XS-CFG-003"]);
  });

  test("Nach save_scenario schaltet die UI in Read-only um", async ({ browser }) => {
    // Scenario auf SAVED heben via authentifiziertem RPC (Save-Button ist
    // in der Sessions-Row-Action, separat getestet in Journey 04).
    const primary = await getOrCreatePrimaryUser(browser);
    const sb = await createAuthenticatedClient(primary.email, primary.password);
    const { error } = await sb.rpc("save_scenario", { p_scenario_id: scenarioId });
    expect(error).toBeNull();

    const page = await context.newPage();
    const detail = new ScenarioDetailPage(page);
    await detail.gotoIds(sessionId, scenarioId);
    await detail.expectStatus("Gespeichert");
    await detail.expectReadonlyIsins(["XS-CFG-001", "XS-CFG-003"]);

    // Editor-Checkboxen dürfen im SAVED-Zustand nicht existieren.
    await expect(page.getByTestId("bond-selector")).toHaveCount(0);

    await page.close();
  });

  test("RPC lehnt update_scenario_config für SAVED-Scenarios ab", async ({ browser }) => {
    const primary = await getOrCreatePrimaryUser(browser);
    const sb = await createAuthenticatedClient(primary.email, primary.password);
    const { error } = await sb.rpc("update_scenario_config", {
      p_scenario_id: scenarioId,
      p_config: { selectedIsins: ["XS-CFG-002"] },
    });
    expect(error, "SAVED-Scenario darf kein Config-Update zulassen").not.toBeNull();
    expect(error!.message).toMatch(/DRAFT|keine Berechtigung/i);

    // Sanity: DB hat die ursprüngliche Auswahl noch.
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("scenarios")
      .select("config")
      .eq("id", scenarioId)
      .single();
    const config = data?.config as { selectedIsins?: string[] } | null;
    expect(config?.selectedIsins).toEqual(["XS-CFG-001", "XS-CFG-003"]);
  });
});
