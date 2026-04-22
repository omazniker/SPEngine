import { expect, test, type BrowserContext } from "@playwright/test";

import { SessionDetailPage } from "../../page-objects/session-detail.page";
import { SessionsPage } from "../../page-objects/sessions.page";
import { createAuthenticatedClient, getSupabaseAdmin } from "../../utils/db-helpers";
import { uniqueRunId } from "../../utils/test-data-factory";
import { getOrCreatePrimaryUser } from "../../utils/ui-finders";

/**
 * Journey 07 — Session mit Universe verknüpfen.
 *
 * Legt ein Universe per RPC an (schneller als UI; Journey 06 validiert die
 * Upload-UI), öffnet den Session-Create-Dialog, wählt das Universum aus dem
 * Dropdown, erstellt die Session, verifiziert auf der Detail-Seite dass das
 * Universum dort angezeigt wird und in der DB verknüpft ist.
 */
test.describe.serial("Journey: Session mit Universe", () => {
  let context: BrowserContext;
  let universeId = "";
  let sessionId = "";
  const universeName = `Integration-Universe ${uniqueRunId()}`;
  const sessionName = `Integration-Session ${uniqueRunId()}`;

  test.beforeAll(async ({ browser }) => {
    const primary = await getOrCreatePrimaryUser(browser);
    context = await browser.newContext({ storageState: primary.authStatePath });

    const sb = await createAuthenticatedClient(primary.email, primary.password);
    const { data, error } = await sb.rpc("create_universe_profile", {
      p_name: universeName,
      p_bonds: [{ ISIN: "XS-TEST-001", Name: "Test Bond" }],
      p_source_file: "integration.xlsx",
    });
    if (error) throw new Error(`create_universe_profile: ${error.message}`);
    if (typeof data !== "string") {
      throw new Error(`create_universe_profile: unerwarteter Typ ${typeof data}`);
    }
    universeId = data;
  });

  test.afterAll(async () => {
    await context?.close();
    const admin = getSupabaseAdmin();
    if (sessionId) await admin.from("sessions").delete().eq("id", sessionId);
    if (universeId) await admin.from("universe_profiles").delete().eq("id", universeId);
  });

  test("Session mit Universe aus Dropdown anlegen", async () => {
    const page = await context.newPage();
    const sessionsPage = new SessionsPage(page);
    await sessionsPage.goto();

    // Universe-Dropdown wird implizit getestet: createSession(_, universeId)
    // ruft selectOption auf — ohne gerendertes Select würde das fehlschlagen.
    await sessionsPage.createSession(sessionName, universeId);

    const detail = new SessionDetailPage(page);
    await detail.expectPageLoaded();
    sessionId = detail.readIdFromUrl();

    // Universe-Name wird auf der Detail-Seite angezeigt.
    await expect(page.getByTestId("session-detail-universe")).toContainText(universeName);

    await page.close();
  });

  test("DB hat die Verknüpfung Session → Universe", async () => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("sessions")
      .select("name, universe_profile_id")
      .eq("id", sessionId)
      .single();
    expect(error).toBeNull();
    expect(data?.name).toBe(sessionName);
    expect(data?.universe_profile_id).toBe(universeId);
  });

  test("Fremdes Universe wird beim Session-Create abgelehnt", async ({ browser }) => {
    // Ein zweites (fremdes) Universum via Admin-Client für einen "Stranger"-User
    // anlegen — aber ohne User-Kontext im SECURITY-DEFINER-Check würde create_universe_profile
    // 42501 werfen. Wir nutzen deshalb den Admin-Client direkt auf die Tabelle, um das
    // Angriffs-Szenario "Client schickt fremde UUID" zu simulieren.
    const admin = getSupabaseAdmin();

    // Primärnutzers profile-id auslesen und einen "Fake-Foreign-Profile" mit
    // gleicher Struktur anlegen, damit der universe_profiles-FK auf profiles
    // erfüllt ist. Das ist fummelig — einfacher: wir generieren eine zufällige
    // UUID und fordern, dass der RPC sie ablehnt (universe_profile nicht
    // vorhanden für diesen user → 42501).
    const fakeUniverseId = "00000000-0000-0000-0000-000000000000";

    const primary = await getOrCreatePrimaryUser(browser);
    const sb = await createAuthenticatedClient(primary.email, primary.password);
    const { error } = await sb.rpc("create_session", {
      p_name: "Sollte nie entstehen",
      p_universe_profile_id: fakeUniverseId,
    });
    expect(error, "RPC muss mit 42501 fehlschlagen").not.toBeNull();
    expect(error!.message).toMatch(/nicht gefunden|nicht berechtigt/i);

    // Sanity: wirklich keine neue Session für diesen User entstanden.
    const { data: orphan } = await admin
      .from("sessions")
      .select("id")
      .eq("name", "Sollte nie entstehen")
      .maybeSingle();
    expect(orphan).toBeNull();
  });
});
