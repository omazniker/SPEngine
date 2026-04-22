import { existsSync, readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { journeySet } from "../../infrastructure/journey-store";
import { getOrCreatePrimaryUser } from "../../utils/ui-finders";

/**
 * Journey 01 — User-Setup.
 *
 * Führt Registrierung + E-Mail-Verifikation + Login über die UI aus und
 * persistiert Storage-State + Referenzen für Folge-Journeys.
 *
 * Re-Runs nutzen den TestUserStore und die Auth-State-Datei wieder, sofern noch
 * vorhanden (siehe `ensureUser`).
 */
test.describe.serial("Journey: User-Setup", () => {
  // Erster Signup hat mehrere Server-Aktionen (Signup → Trigger → Login) —
  // auf dem On-Demand-Dev-Server braucht das einmal > 30s.
  test.slow();

  test("Primärnutzer per UI-Flow bereitstellen", async ({ browser }) => {
    const user = await getOrCreatePrimaryUser(browser);

    expect(user.email).toBe("e2e-primary@test.local");
    expect(user.password).toBeTruthy();
    expect(user.profileId, "Supabase-Profile muss nach Signup existieren").toBeTruthy();
    expect(user.authStatePath, "Storage-State-Pfad muss gesetzt sein").toBeTruthy();
    expect(existsSync(user.authStatePath!), "Storage-State-Datei muss geschrieben sein").toBe(
      true,
    );

    journeySet("user-email", user.email);
    journeySet("user-password", user.password);
    journeySet("user-auth", user.authStatePath!);
    if (user.profileId) journeySet("user-profileId", user.profileId);
  });

  test("Storage-State enthält Supabase-Auth-Cookies", async ({ browser }) => {
    const user = await getOrCreatePrimaryUser(browser);
    expect(user.authStatePath).toBeTruthy();

    const raw = readFileSync(user.authStatePath!, "utf-8");
    const storage = JSON.parse(raw) as { cookies?: Array<{ name: string; value: string }> };
    const cookies = storage.cookies ?? [];
    const sbCookie = cookies.find((c) => c.name.startsWith("sb-") && c.value.length > 0);
    expect(sbCookie, "Mindestens ein sb-*-Cookie (Supabase-Session) muss gesetzt sein").toBeTruthy();

    // Sanity: Browser-Context lässt sich mit dem Storage-State wiederherstellen.
    const context = await browser.newContext({ storageState: user.authStatePath });
    try {
      const page = await context.newPage();
      const response = await page.goto("/");
      expect(response?.ok(), "Landing Page muss für eingeloggte Nutzer weiter erreichbar sein").toBeTruthy();
    } finally {
      await context.close();
    }
  });
});
