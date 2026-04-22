import { expect, test } from "@playwright/test";

import { createAuthenticatedClient, getSupabaseAdmin } from "../../utils/db-helpers";
import { getOrCreatePrimaryUser, getOrCreateSecondaryUser } from "../../utils/ui-finders";

/**
 * Journey 02 — RLS-Isolation.
 *
 * Verifiziert, dass der Sekundärnutzer keine Sessions des Primärnutzers sieht.
 * Zwei Angriffsflächen:
 *   1. Direkt gegen Supabase (RPC + Table) mit Secondary-JWT.
 *   2. Durch Next.js auf `/sessions/[id]` mit Secondary-Storage-State.
 *
 * Beide müssen die Primary-Session verstecken (get_sessions filtert sie raus,
 * get_session liefert null, Next.js ruft notFound() → HTTP 404).
 */
test.describe.serial("Journey: RLS Isolation", () => {
  let primarySessionId: string;

  test.beforeAll(async ({ browser }) => {
    // Beide User über die gewohnten Fixtures bereitstellen (inkl. Storage-State).
    const primary = await getOrCreatePrimaryUser(browser);
    await getOrCreateSecondaryUser(browser);

    // Primary erstellt eine Session via authentifiziertem RPC-Call.
    const primaryClient = await createAuthenticatedClient(primary.email, primary.password);
    const { data, error } = await primaryClient.rpc("create_session", {
      p_name: `RLS-Test ${new Date().toISOString()}`,
    });
    if (error) throw new Error(`create_session fehlgeschlagen: ${error.message}`);
    if (typeof data !== "string") {
      throw new Error(`create_session lieferte unerwarteten Typ: ${typeof data}`);
    }
    primarySessionId = data;
  });

  test.afterAll(async () => {
    // Cleanup mit Service-Role, damit der Test auch bei fehlgeschlagenen Asserts
    // nicht Leichen in der DB hinterlässt.
    if (!primarySessionId) return;
    const admin = getSupabaseAdmin();
    await admin.from("sessions").delete().eq("id", primarySessionId);
  });

  test("Secondary-RPC get_sessions enthält die Primary-Session nicht", async ({ browser }) => {
    const secondary = await getOrCreateSecondaryUser(browser);
    const client = await createAuthenticatedClient(secondary.email, secondary.password);

    const { data, error } = await client.rpc("get_sessions");
    expect(error, "get_sessions darf keinen Fehler werfen").toBeNull();
    expect(data, "Response muss ein Array sein").toEqual(expect.any(Array));
    const ids = (data as Array<{ id: string }>).map((s) => s.id);
    expect(ids).not.toContain(primarySessionId);
  });

  test("Secondary-RPC get_session liefert null für die Primary-Session", async ({ browser }) => {
    const secondary = await getOrCreateSecondaryUser(browser);
    const client = await createAuthenticatedClient(secondary.email, secondary.password);

    const { data, error } = await client.rpc("get_session", {
      p_session_id: primarySessionId,
      p_include_scenarios: false,
    });
    expect(error, "RPC darf keinen RLS-Fehler werfen, nur null zurückgeben").toBeNull();
    expect(data).toBeNull();
  });

  test("Secondary-Browser bekommt 404 auf /sessions/[primarySessionId]", async ({ browser }) => {
    const secondary = await getOrCreateSecondaryUser(browser);
    const context = await browser.newContext({ storageState: secondary.authStatePath });
    try {
      const page = await context.newPage();
      const response = await page.goto(`/sessions/${primarySessionId}`);
      expect(response, "goto muss eine Response liefern").not.toBeNull();
      expect(response!.status(), "fremde Session muss 404 liefern").toBe(404);
    } finally {
      await context.close();
    }
  });

  test("Secondary kann archive_session der Primary-Session nicht aufrufen", async ({ browser }) => {
    const secondary = await getOrCreateSecondaryUser(browser);
    const client = await createAuthenticatedClient(secondary.email, secondary.password);

    const { error } = await client.rpc("archive_session", {
      p_session_id: primarySessionId,
    });
    // RPC ist SECURITY DEFINER + prüft user_id explizit — fremde Session = 42501.
    expect(error, "archive_session muss für fremde Sessions fehlschlagen").not.toBeNull();
    expect(error!.message).toMatch(/nicht berechtigt|not found|ARCHIVED/i);
  });
});
