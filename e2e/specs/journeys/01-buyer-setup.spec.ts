import { existsSync, readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { journeySet } from "../../infrastructure/journey-store";
import { getOrCreateBuyer } from "../../utils/ui-finders";

/**
 * Journey 01 — Buyer-Setup.
 *
 * Führt Registrierung + E-Mail-Verifikation + Login über die UI aus und
 * persistiert Storage-State + Referenzen für Folge-Journeys.
 *
 * Re-Runs nutzen den TestUserStore und die Auth-State-Datei wieder, sofern noch
 * vorhanden (siehe `ensureUser`).
 */
test.describe.serial("Journey: Buyer-Setup", () => {
  // Erster Signup hat mehrere Server-Aktionen (Signup → Trigger → Login) —
  // auf dem On-Demand-Dev-Server braucht das einmal > 30s.
  test.slow();

  test("Buyer per UI-Flow bereitstellen", async ({ browser }) => {
    const buyer = await getOrCreateBuyer(browser);

    expect(buyer.email).toBe("e2e-buyer@test.local");
    expect(buyer.password).toBeTruthy();
    expect(buyer.role).toBe("buyer");
    expect(buyer.profileId, "Supabase-Profile muss nach Signup existieren").toBeTruthy();
    expect(buyer.authStatePath, "Storage-State-Pfad muss gesetzt sein").toBeTruthy();
    expect(existsSync(buyer.authStatePath!), "Storage-State-Datei muss geschrieben sein").toBe(
      true,
    );

    journeySet("buyer-email", buyer.email);
    journeySet("buyer-password", buyer.password);
    journeySet("buyer-auth", buyer.authStatePath!);
    if (buyer.profileId) journeySet("buyer-profileId", buyer.profileId);
  });

  test("Storage-State enthält Supabase-Auth-Cookies", async ({ browser }) => {
    const buyer = await getOrCreateBuyer(browser);
    expect(buyer.authStatePath).toBeTruthy();

    const raw = readFileSync(buyer.authStatePath!, "utf-8");
    const storage = JSON.parse(raw) as { cookies?: Array<{ name: string; value: string }> };
    const cookies = storage.cookies ?? [];
    const sbCookie = cookies.find((c) => c.name.startsWith("sb-") && c.value.length > 0);
    expect(sbCookie, "Mindestens ein sb-*-Cookie (Supabase-Session) muss gesetzt sein").toBeTruthy();

    // Sanity: Browser-Context lässt sich mit dem Storage-State wiederherstellen.
    const context = await browser.newContext({ storageState: buyer.authStatePath });
    try {
      const page = await context.newPage();
      const response = await page.goto("/");
      expect(response?.ok(), "Landing Page muss für eingeloggte Buyer weiter erreichbar sein").toBeTruthy();
    } finally {
      await context.close();
    }
  });
});
