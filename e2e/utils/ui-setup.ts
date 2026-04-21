/**
 * UI-Setup-Funktionen — führen komplette UI-Flows aus und geben Entity-IDs zurück.
 *
 * **Status:** Skelett. Echte Implementierung folgt, sobald die SPEngine-Next-Domäne
 * (Cases, Sourcings, Offers, …) steht und entsprechende Page Objects existieren.
 * Regel aus CLAUDE-TEST.md: Diese Funktionen NIEMALS direkt in Specs aufrufen —
 * stattdessen `getOrCreate*()` aus `ui-finders.ts` nutzen.
 */
import type { Browser } from "@playwright/test";

export async function createBuyer(_browser: Browser): Promise<never> {
  throw new Error("createBuyer: noch nicht implementiert (siehe e2e/TODO).");
}

export async function createSupplier(_browser: Browser, _index: number): Promise<never> {
  throw new Error("createSupplier: noch nicht implementiert (siehe e2e/TODO).");
}

export async function createSourcing(
  _browser: Browser,
  _opts: { buyerEmail: string; supplierEmails: string[] },
): Promise<never> {
  throw new Error("createSourcing: noch nicht implementiert (siehe e2e/TODO).");
}

export async function submitOffer(
  _browser: Browser,
  _opts: { sourcingId: string; supplierEmail: string },
): Promise<never> {
  throw new Error("submitOffer: noch nicht implementiert (siehe e2e/TODO).");
}

export async function createNegotiationRound(
  _browser: Browser,
  _opts: { sourcingId: string; buyerEmail: string },
): Promise<never> {
  throw new Error("createNegotiationRound: noch nicht implementiert (siehe e2e/TODO).");
}

export async function createOrder(
  _browser: Browser,
  _opts: { sourcingId: string; buyerEmail: string },
): Promise<never> {
  throw new Error("createOrder: noch nicht implementiert (siehe e2e/TODO).");
}

export async function createApprover(_browser: Browser): Promise<never> {
  throw new Error("createApprover: noch nicht implementiert (siehe e2e/TODO).");
}
