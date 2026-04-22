import type { Browser } from "@playwright/test";

import { ensureUser } from "../infrastructure/auth-manager";
import { journeyGet, journeyHas, journeySet } from "../infrastructure/journey-store";
import { type TestUser } from "../infrastructure/test-user-store";
import { DEFAULT_PASSWORD, PRIMARY_EMAIL, SECONDARY_EMAIL } from "./test-data-factory";

/**
 * Liefert den Primär-Testnutzer für SPEngine-Journeys. Erstellt ihn beim ersten
 * Aufruf per UI-Signup + Login (siehe `auth-manager.ensureUser`).
 */
export async function getOrCreatePrimaryUser(browser: Browser): Promise<TestUser> {
  return ensureUser(browser, {
    email: PRIMARY_EMAIL,
    password: DEFAULT_PASSWORD,
  });
}

/**
 * Liefert den Sekundär-Testnutzer — nur für Mandantentrennungs-Tests (RLS,
 * geteilte Sessions) benötigt.
 */
export async function getOrCreateSecondaryUser(browser: Browser): Promise<TestUser> {
  return ensureUser(browser, {
    email: SECONDARY_EMAIL,
    password: DEFAULT_PASSWORD,
  });
}

/**
 * Generischer Journey-Store-basierter Cache für Entities. Wert muss JSON-serialisierbar sein.
 */
export async function getOrCreateJourneyEntity<T>(
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  if (journeyHas(key)) {
    return journeyGet(key) as unknown as T;
  }
  const value = await factory();
  journeySet(key, value as unknown as Parameters<typeof journeySet>[1]);
  return value;
}

export { DEFAULT_PASSWORD, PRIMARY_EMAIL, SECONDARY_EMAIL };
export type { TestUser };
