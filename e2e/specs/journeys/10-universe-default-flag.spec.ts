import { expect, test, type BrowserContext } from "@playwright/test";

import { SessionsPage } from "../../page-objects/sessions.page";
import { UniverseDetailPage } from "../../page-objects/universe-detail.page";
import { createAuthenticatedClient, getSupabaseAdmin } from "../../utils/db-helpers";
import { uniqueRunId } from "../../utils/test-data-factory";
import { getOrCreatePrimaryUser } from "../../utils/ui-finders";

/**
 * Journey 10 — Universe-Default-Flag + Session-Create-Integration.
 *
 * Zwei Universen anlegen, eines als Default markieren, prüfen dass
 *   (a) die Liste das Default-Sternchen zeigt,
 *   (b) Session-Create mit leerer Auswahl → Session landet beim Default,
 *   (c) Toggle zwischen zwei Universen: der bisherige Default verliert den Flag,
 *   (d) RPC-Level Unique-Constraint erlaubt max 1 Default pro User.
 */
test.describe.serial("Journey: Universe-Default-Flag", () => {
  let context: BrowserContext;
  let firstUniverseId = "";
  let secondUniverseId = "";
  let sessionId = "";
  const firstName = `Default-A ${uniqueRunId()}`;
  const secondName = `Default-B ${uniqueRunId()}`;

  test.beforeAll(async ({ browser }) => {
    const primary = await getOrCreatePrimaryUser(browser);
    context = await browser.newContext({ storageState: primary.authStatePath });

    const sb = await createAuthenticatedClient(primary.email, primary.password);

    const { data: aid, error: aErr } = await sb.rpc("create_universe_profile", {
      p_name: firstName,
      p_bonds: [{ ISIN: "XS-DFLT-A", Name: "A" }],
    });
    if (aErr) throw new Error(`create_universe_profile A: ${aErr.message}`);
    firstUniverseId = aid as string;

    const { data: bid, error: bErr } = await sb.rpc("create_universe_profile", {
      p_name: secondName,
      p_bonds: [{ ISIN: "XS-DFLT-B", Name: "B" }],
    });
    if (bErr) throw new Error(`create_universe_profile B: ${bErr.message}`);
    secondUniverseId = bid as string;
  });

  test.afterAll(async () => {
    await context?.close();
    const admin = getSupabaseAdmin();
    if (sessionId) await admin.from("sessions").delete().eq("id", sessionId);
    if (firstUniverseId) await admin.from("universe_profiles").delete().eq("id", firstUniverseId);
    if (secondUniverseId) await admin.from("universe_profiles").delete().eq("id", secondUniverseId);
  });

  test("Toggle macht Universe A zum Default, Liste zeigt Stern", async () => {
    const page = await context.newPage();
    const detail = new UniverseDetailPage(page);
    await detail.gotoId(firstUniverseId);
    await detail.expectIsDefault(false);

    await detail.toggleDefault();
    await detail.expectIsDefault(true);

    // In der Liste erscheint das Stern-Icon neben A.
    await page.goto("/universe");
    await expect(page.getByTestId(`universe-default-star-${firstUniverseId}`)).toBeVisible();
    await expect(page.getByTestId(`universe-default-star-${secondUniverseId}`)).toHaveCount(0);

    await page.close();
  });

  test("Session-Create ohne explizite Wahl landet beim Default-Universum", async () => {
    const page = await context.newPage();
    const sessionsPage = new SessionsPage(page);
    await sessionsPage.goto();

    // Dialog öffnen, prüfen dass Default pre-selected ist — und direkt
    // submitten (kein Cancel-Reset dazwischen, weil ein Dialog-Close-und-
    // Reopen zyklus die Pre-Selection nicht immer zuverlässig wiederherstellt).
    const sessionName = `Session mit Default ${uniqueRunId()}`;
    await page.getByTestId("sessions-create-button").click();
    await expect(page.getByTestId("sessions-create-dialog")).toBeVisible();
    await expect(page.getByTestId("session-create-universe-select")).toHaveValue(
      firstUniverseId,
    );
    await page.getByTestId("session-create-name-input").fill(sessionName);
    await page.getByTestId("session-create-submit").click();

    // DB-Verifikation: Session verweist auf firstUniverseId.
    const admin = getSupabaseAdmin();
    // Kleiner Retry weil die Action via router.refresh asynchron ist —
    // Select-Submit schreibt sofort in die DB, aber der Assertion kann
    // vor der Commit-Bestätigung laufen.
    await expect
      .poll(async () => {
        const { data } = await admin
          .from("sessions")
          .select("id, universe_profile_id")
          .eq("name", sessionName)
          .maybeSingle();
        return data?.universe_profile_id ?? null;
      })
      .toBe(firstUniverseId);

    const { data: row } = await admin
      .from("sessions")
      .select("id")
      .eq("name", sessionName)
      .single();
    sessionId = row!.id;

    await page.close();
  });

  test("Toggle-RPC auf B zieht den Flag von A ab (direkter RPC-Call)", async ({ browser }) => {
    // RPC direkt testen, isoliert vom UI-Flow. Wenn das grün ist und die
    // UI-Variante rot war, liegt der Bug nicht im Backend-Toggle sondern
    // im Server-Action/router.refresh-Kontext.
    const primary = await getOrCreatePrimaryUser(browser);
    const sb = await createAuthenticatedClient(primary.email, primary.password);

    const { data: toggled, error: toggleErr } = await sb.rpc(
      "toggle_universe_profile_default",
      { p_id: secondUniverseId },
    );
    expect(toggleErr).toBeNull();
    expect(toggled).toBe(true);

    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("universe_profiles")
      .select("id, is_default")
      .in("id", [firstUniverseId, secondUniverseId]);
    const byId = new Map(data!.map((r) => [r.id, r.is_default]));
    expect(byId.get(firstUniverseId)).toBe(false);
    expect(byId.get(secondUniverseId)).toBe(true);
  });

  test("DB-Unique-Index verhindert zwei Defaults pro User", async () => {
    // Admin-Client umgeht RLS + SECURITY DEFINER. Direktes UPDATE, das A zusätzlich
    // zu B auf is_default=true setzt, muss am partial unique index scheitern.
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("universe_profiles")
      .update({ is_default: true })
      .eq("id", firstUniverseId);
    expect(error, "Zweiter Default darf nicht entstehen").not.toBeNull();
    expect(error!.message).toMatch(/universe_profiles_one_default_per_user|duplicate key/i);
  });
});
