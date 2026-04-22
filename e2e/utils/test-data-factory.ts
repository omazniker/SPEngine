export const DEFAULT_PASSWORD = "Test1234!E2E";

/**
 * SPEngine ist ein Single-User-Portfolio-Optimizer. Ein Primärnutzer reicht für
 * die meisten Journeys; der Sekundärnutzer wird nur gebraucht, wenn ein Szenario
 * explizit Mandantentrennung (RLS, geteilte Sessions) prüfen soll.
 */
export const PRIMARY_EMAIL = "e2e-primary@test.local";
export const SECONDARY_EMAIL = "e2e-secondary@test.local";

export function uniqueRunId(): string {
  return `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
