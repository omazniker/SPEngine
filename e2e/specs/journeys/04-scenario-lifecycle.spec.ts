import { expect, test, type BrowserContext } from "@playwright/test";

import { SessionDetailPage } from "../../page-objects/session-detail.page";
import { createAuthenticatedClient, getSupabaseAdmin } from "../../utils/db-helpers";
import { uniqueRunId } from "../../utils/test-data-factory";
import { getOrCreatePrimaryUser } from "../../utils/ui-finders";

/**
 * Journey 04 — Scenario-Lifecycle.
 *
 * State-Machine-Pfad DRAFT → SAVED → DELETED über die UI der Session-Detail-
 * Seite. Setup legt eine Host-Session via authentifizierte RPC an (Journey 03
 * validiert die UI-Erstellung schon, hier reicht der schnellere Pfad).
 *
 * `sessions`-FK auf `scenarios` hat ON DELETE CASCADE — das afterAll löscht
 * die Session und zieht Scenario-Leichen automatisch mit.
 */
test.describe.serial("Journey: Scenario-Lifecycle", () => {
  let context: BrowserContext;
  let sessionId = "";
  let scenarioId = "";
  const scenarioName = `Scenario ${uniqueRunId()}`;

  test.beforeAll(async ({ browser }) => {
    const primary = await getOrCreatePrimaryUser(browser);
    context = await browser.newContext({ storageState: primary.authStatePath });

    const sb = await createAuthenticatedClient(primary.email, primary.password);
    const { data, error } = await sb.rpc("create_session", {
      p_name: `Scenario-LC Host ${uniqueRunId()}`,
    });
    if (error) throw new Error(`create_session fehlgeschlagen: ${error.message}`);
    if (typeof data !== "string") {
      throw new Error(`create_session lieferte unerwarteten Typ: ${typeof data}`);
    }
    sessionId = data;
  });

  test.afterAll(async () => {
    await context?.close();
    if (sessionId) {
      const admin = getSupabaseAdmin();
      // ON DELETE CASCADE auf scenarios.session_id → Szenarien werden mit abgeräumt.
      await admin.from("sessions").delete().eq("id", sessionId);
    }
  });

  test("Scenario via UI anlegen → Status „Entwurf“", async () => {
    const page = await context.newPage();
    const detail = new SessionDetailPage(page);
    await detail.gotoId(sessionId);

    await detail.createScenario(scenarioName);
    scenarioId = await detail.findScenarioIdByName(scenarioName);
    expect(scenarioId).toMatch(/^[0-9a-f-]{36}$/);
    await detail.expectScenarioStatus(scenarioId, "Entwurf");

    await page.close();
  });

  test("Speichern setzt Status auf „Gespeichert“", async () => {
    const page = await context.newPage();
    const detail = new SessionDetailPage(page);
    await detail.gotoId(sessionId);

    await detail.saveScenarioRow(scenarioId);
    await detail.expectScenarioStatus(scenarioId, "Gespeichert");

    await page.close();
  });

  test("Löschen entfernt das Scenario aus Liste und DB", async () => {
    const page = await context.newPage();
    const detail = new SessionDetailPage(page);
    await detail.gotoId(sessionId);

    await detail.deleteScenarioRow(scenarioId);
    await detail.expectScenarioMissing(scenarioId);

    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("scenarios")
      .select("id")
      .eq("id", scenarioId)
      .maybeSingle();
    expect(data).toBeNull();

    await page.close();
  });
});
