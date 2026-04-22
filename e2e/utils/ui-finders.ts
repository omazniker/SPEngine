import type { Browser } from "@playwright/test";

import { ensureUser } from "../infrastructure/auth-manager";
import { journeyGet, journeyHas, journeySet } from "../infrastructure/journey-store";
import { type TestUser, type TestUserRole } from "../infrastructure/test-user-store";
import { DEFAULT_PASSWORD, SINGLETON_EMAILS, supplierEmail } from "./test-data-factory";

/**
 * Liefert den Singleton-Buyer-User. Erstellt ihn beim ersten Aufruf per UI-Signup
 * + Login (siehe `auth-manager.ensureUser`).
 */
export async function getOrCreateBuyer(browser: Browser): Promise<TestUser> {
  return ensureUser(browser, {
    email: SINGLETON_EMAILS.buyer,
    password: DEFAULT_PASSWORD,
    role: "buyer",
    company: "Buyer E2E GmbH",
  });
}

/**
 * Liefert den Singleton-Approver-User.
 */
export async function getOrCreateApprover(browser: Browser): Promise<TestUser> {
  return ensureUser(browser, {
    email: SINGLETON_EMAILS.approver,
    password: DEFAULT_PASSWORD,
    role: "approver",
    company: "Approver E2E GmbH",
  });
}

/**
 * Liefert einen indexed Supplier-User (0-basiert). Mehrere Supplier werden über
 * unterschiedliche Indizes angelegt.
 */
export async function getOrCreateSupplier(browser: Browser, index = 0): Promise<TestUser> {
  return ensureUser(browser, {
    email: supplierEmail(index),
    password: DEFAULT_PASSWORD,
    role: "supplier",
    company: `Supplier ${index} E2E GmbH`,
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
