import type { Browser } from "@playwright/test";

import { journeyGet, journeyHas, journeySet } from "../infrastructure/journey-store";
import {
  getStoredTestUser,
  storeTestUser,
  type TestUser,
  type TestUserRole,
} from "../infrastructure/test-user-store";
import { DEFAULT_PASSWORD, SINGLETON_EMAILS, supplierEmail } from "./test-data-factory";

/**
 * Liefert den Singleton-Buyer-User. Erstellt ihn beim ersten Aufruf.
 *
 * **Status:** Skelett. `ensureUser` in `auth-manager` wirft noch, bis Login/Signup-Seiten stehen.
 */
export async function getOrCreateBuyer(_browser: Browser): Promise<TestUser> {
  const cached = getStoredTestUser(SINGLETON_EMAILS.buyer);
  if (cached) return cached;

  return storeTestUser({
    email: SINGLETON_EMAILS.buyer,
    password: DEFAULT_PASSWORD,
    role: "buyer",
  });
}

/**
 * Liefert den Singleton-Approver-User.
 */
export async function getOrCreateApprover(_browser: Browser): Promise<TestUser> {
  const cached = getStoredTestUser(SINGLETON_EMAILS.approver);
  if (cached) return cached;

  return storeTestUser({
    email: SINGLETON_EMAILS.approver,
    password: DEFAULT_PASSWORD,
    role: "approver",
  });
}

/**
 * Liefert einen indexed Supplier-User (0-basiert). Mehrere Supplier werden über
 * unterschiedliche Indizes angelegt.
 */
export async function getOrCreateSupplier(_browser: Browser, index = 0): Promise<TestUser> {
  const email = supplierEmail(index);
  const cached = getStoredTestUser(email);
  if (cached) return cached;

  return storeTestUser({
    email,
    password: DEFAULT_PASSWORD,
    role: "supplier",
  });
}

export async function getOrCreateSuppliers(browser: Browser, count: number): Promise<TestUser[]> {
  const result: TestUser[] = [];
  for (let i = 0; i < count; i++) {
    result.push(await getOrCreateSupplier(browser, i));
  }
  return result;
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

export { DEFAULT_PASSWORD, SINGLETON_EMAILS, supplierEmail };

// Aliase mit festen Variablen-Namen, damit Tests wie im AGENTS.md-Stil lesen.
export const BUYER_EMAIL = SINGLETON_EMAILS.buyer;
export const APPROVER_EMAIL = SINGLETON_EMAILS.approver;
export const ADMIN_EMAIL = SINGLETON_EMAILS.admin;

export type { TestUser, TestUserRole };
