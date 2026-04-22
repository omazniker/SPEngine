import { expect, test, type BrowserContext } from "@playwright/test";

import { journeySet } from "../../infrastructure/journey-store";
import { SessionDetailPage } from "../../page-objects/session-detail.page";
import { SessionsPage } from "../../page-objects/sessions.page";
import { getSupabaseAdmin } from "../../utils/db-helpers";
import { uniqueRunId } from "../../utils/test-data-factory";
import { getOrCreatePrimaryUser } from "../../utils/ui-finders";

/**
 * Journey 03 — Session-Lifecycle.
 *
 * Spielt den vollen State-Machine-Pfad ACTIVE → ARCHIVED → ACTIVE → ARCHIVED →
 * DELETED über die UI durch. Jeder Schritt nutzt die Page-Objects und prüft
 * die Status-Badge in der Liste + das entsprechende Toast (implizit via
 * Route-Navigation).
 *
 * Voraussetzung: Primärnutzer ist eingeloggt (Storage-State aus Journey 01).
 */
test.describe.serial("Journey: Session-Lifecycle", () => {
  let context: BrowserContext;
  let sessionId = "";
  const sessionName = `Lifecycle ${uniqueRunId()}`;

  test.beforeAll(async ({ browser }) => {
    const primary = await getOrCreatePrimaryUser(browser);
    context = await browser.newContext({ storageState: primary.authStatePath });
  });

  test.afterAll(async () => {
    await context?.close();

    // Safety-Net: Falls einer der Tests vor dem Delete-Schritt failed, die Zeile
    // via Admin-Client abräumen, damit Re-Runs idempotent bleiben.
    if (sessionId) {
      const admin = getSupabaseAdmin();
      await admin.from("sessions").delete().eq("id", sessionId);
    }
  });

  test("Session via UI anlegen → Redirect auf Detail", async () => {
    const page = await context.newPage();
    const sessionsPage = new SessionsPage(page);
    await sessionsPage.goto();

    await sessionsPage.createSession(sessionName);

    const detail = new SessionDetailPage(page);
    await detail.expectPageLoaded();
    sessionId = detail.readIdFromUrl();
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
    await detail.expectSessionId(sessionId);

    journeySet("lifecycle-session-id", sessionId);
    await page.close();
  });

  test("Session erscheint in Liste mit Status „Aktiv“", async () => {
    const page = await context.newPage();
    const sessionsPage = new SessionsPage(page);
    await sessionsPage.goto();

    await expect(sessionsPage.row(sessionId)).toContainText(sessionName);
    await sessionsPage.expectRowStatus(sessionId, "Aktiv");
    await page.close();
  });

  test("Archivieren setzt Status auf „Archiviert“", async () => {
    const page = await context.newPage();
    const sessionsPage = new SessionsPage(page);
    await sessionsPage.goto();

    await sessionsPage.archiveRow(sessionId);
    await sessionsPage.expectRowStatus(sessionId, "Archiviert");
    await page.close();
  });

  test("Wiederherstellen setzt Status zurück auf „Aktiv“", async () => {
    const page = await context.newPage();
    const sessionsPage = new SessionsPage(page);
    await sessionsPage.goto();

    await sessionsPage.restoreRow(sessionId);
    await sessionsPage.expectRowStatus(sessionId, "Aktiv");
    await page.close();
  });

  test("Erneut archivieren + löschen entfernt die Session aus der Liste", async () => {
    const page = await context.newPage();
    const sessionsPage = new SessionsPage(page);
    await sessionsPage.goto();

    await sessionsPage.archiveRow(sessionId);
    await sessionsPage.expectRowStatus(sessionId, "Archiviert");

    await sessionsPage.deleteRow(sessionId);
    await sessionsPage.expectRowMissing(sessionId);

    // DB-Verifikation: Zeile ist wirklich weg (nicht nur UI-Filter).
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .maybeSingle();
    expect(data).toBeNull();

    // Nach erfolgreichem Delete: Cleanup im afterAll überspringen.
    sessionId = "";
    await page.close();
  });
});
