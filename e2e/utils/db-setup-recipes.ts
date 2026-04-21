import { getSupabaseAdmin } from "./db-helpers";

/**
 * DB-Setup-Rezepte — komplexe Vorbedingungen die nicht über die UI testbar sind
 * (Approval-Policies, Subscriptions, Supplier-Pools etc.).
 *
 * **Status:** Skelett. Rezepte werden ergänzt, sobald die entsprechenden
 * SPEngine-Next-Tabellen existieren.
 */

export async function ensureApprovalPolicy(_orgId: string): Promise<never> {
  const _db = getSupabaseAdmin();
  throw new Error("ensureApprovalPolicy: noch nicht implementiert.");
}

export async function ensureActiveSubscription(
  _orgId: string,
  _plan: "starter" | "professional",
): Promise<never> {
  const _db = getSupabaseAdmin();
  throw new Error("ensureActiveSubscription: noch nicht implementiert.");
}

export async function ensureSupplierPool(_count: number): Promise<never> {
  const _db = getSupabaseAdmin();
  throw new Error("ensureSupplierPool: noch nicht implementiert.");
}
