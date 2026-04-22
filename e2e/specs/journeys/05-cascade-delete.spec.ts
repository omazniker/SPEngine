import { expect, test, type BrowserContext } from "@playwright/test";

import { SessionsPage } from "../../page-objects/sessions.page";
import { createAuthenticatedClient, getSupabaseAdmin } from "../../utils/db-helpers";
import { uniqueRunId } from "../../utils/test-data-factory";
import { getOrCreatePrimaryUser } from "../../utils/ui-finders";

/**
 * Journey 05 — Cascade Delete (Session → Scenarios).
 *
 * Verifiziert die `ON DELETE CASCADE`-Garantie auf `scenarios.session_id`
 * (siehe Migration `20260421120200_table_scenarios.sql`). Eine Session mit
 * zwei angehängten Scenarios wird über die UI archiviert + gelöscht; das DB-
 * Backend muss die Scenario-Zeilen automatisch mit abräumen.
 *
 * Setup per RPC, damit der Test sich auf den Cascade-Pfad fokussiert statt
 * die Create-UI ein drittes Mal durchzuspielen (Journey 03/04 validieren das).
 */
test.describe.serial("Journey: Cascade Delete (Session → Scenarios)", () => {
  let context: BrowserContext;
  let sessionId = "";
  const scenarioIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const primary = await getOrCreatePrimaryUser(browser);
    context = await browser.newContext({ storageState: primary.authStatePath });

    const sb = await createAuthenticatedClient(primary.email, primary.password);

    const { data: sid, error: sErr } = await sb.rpc("create_session", {
      p_name: `Cascade ${uniqueRunId()}`,
    });
    if (sErr) throw new Error(`create_session: ${sErr.message}`);
    if (typeof sid !== "string") throw new Error(`create_session: unerwarteter Typ ${typeof sid}`);
    sessionId = sid;

    for (let i = 0; i < 2; i++) {
      const { data: scid, error: scErr } = await sb.rpc("create_scenario", {
        p_session_id: sessionId,
        p_name: `Cascade-Child ${i}`,
      });
      if (scErr) throw new Error(`create_scenario[${i}]: ${scErr.message}`);
      if (typeof scid !== "string") {
        throw new Error(`create_scenario[${i}]: unerwarteter Typ ${typeof scid}`);
      }
      scenarioIds.push(scid);
    }
  });

  test.afterAll(async () => {
    await context?.close();
    // Safety-Net: Falls der Haupttest vor dem Delete failed, Session noch abräumen.
    if (sessionId) {
      const admin = getSupabaseAdmin();
      await admin.from("sessions").delete().eq("id", sessionId);
    }
  });

  test("Session via UI archivieren + löschen räumt Child-Scenarios mit", async () => {
    const admin = getSupabaseAdmin();

    // Pre-Check: beide Child-Scenarios existieren wirklich in der DB.
    const { data: before, error: beErr } = await admin
      .from("scenarios")
      .select("id")
      .in("id", scenarioIds);
    expect(beErr).toBeNull();
    expect(before?.map((r) => r.id).sort()).toEqual([...scenarioIds].sort());

    // UI-Flow: archivieren (State-Machine-Pflicht), dann löschen.
    const page = await context.newPage();
    const sessionsPage = new SessionsPage(page);
    await sessionsPage.goto();
    await sessionsPage.archiveRow(sessionId);
    await sessionsPage.expectRowStatus(sessionId, "Archiviert");
    await sessionsPage.deleteRow(sessionId);
    await sessionsPage.expectRowMissing(sessionId);
    await page.close();

    // DB-Verifikation: Session weg.
    const { data: sessAfter } = await admin
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .maybeSingle();
    expect(sessAfter).toBeNull();

    // DB-Verifikation: Beide Child-Scenarios per Cascade mit weg.
    const { data: scenAfter } = await admin
      .from("scenarios")
      .select("id")
      .in("id", scenarioIds);
    expect(scenAfter).toEqual([]);

    // afterAll muss nicht mehr aufräumen.
    sessionId = "";
  });
});
