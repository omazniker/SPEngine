import { expect, test } from "@playwright/test";

import { journeySet } from "../../infrastructure/journey-store";
import { getOrCreateBuyer } from "../../utils/ui-finders";

/**
 * Journey 01 — Buyer-Setup (Template).
 *
 * Sobald Login/Signup stehen, hier den vollständigen UI-Flow ergänzen:
 *   Registrierung → E-Mail-Verifikation (via `journey-helpers.markEmailVerified`)
 *   → Onboarding → Login → Storage-State persistieren.
 *
 * Aktueller Stand: legt nur den Buyer-Eintrag im TestUserStore an und speichert
 * Referenzen im JourneyStore, damit Folge-Journeys lauffähig verdrahtet sind.
 */
test.describe.serial("Journey: Buyer-Setup", () => {
  test("Buyer bereitstellen (getOrCreate)", async ({ browser }) => {
    const buyer = await getOrCreateBuyer(browser);

    expect(buyer.email).toMatch(/^e2e-buyer@test\.local$/);
    expect(buyer.password).toBeTruthy();
    expect(buyer.role).toBe("buyer");

    journeySet("buyer-email", buyer.email);
    journeySet("buyer-password", buyer.password);
    if (buyer.orgId) journeySet("buyer-orgId", buyer.orgId);
  });
});
