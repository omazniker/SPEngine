import type { TestUserRole } from "../infrastructure/test-user-store";

export const DEFAULT_PASSWORD = "Test1234!E2E";

export const SINGLETON_EMAILS: Record<Exclude<TestUserRole, "supplier">, string> = {
  buyer: "e2e-buyer@test.local",
  approver: "e2e-approver@test.local",
  admin: "e2e-admin@test.local",
};

export function supplierEmail(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`supplierEmail: index muss nicht-negative ganze Zahl sein, erhalten: ${index}`);
  }
  return `e2e-supplier-${index}@test.local`;
}

export function companyName(role: TestUserRole, index?: number): string {
  const suffix = typeof index === "number" ? ` ${index}` : "";
  const map: Record<TestUserRole, string> = {
    buyer: "Test Käufer GmbH",
    supplier: "Test Lieferant GmbH",
    approver: "Test Genehmiger GmbH",
    admin: "Test Admin GmbH",
  };
  return `${map[role]}${suffix}`;
}

export function uniqueRunId(): string {
  return `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
