/**
 * State Machine für Scenarios (AGENTS.md §"State Machines").
 * Single Source of Truth — keine hardcoded Status-Strings anderswo.
 *
 * Szenario-Lebenszyklus:
 *   DRAFT → SAVED
 *
 * DRAFT: Optimizer-Output im Arbeitsspeicher, noch nicht persistiert
 * SAVED: Benannt und gespeichert, erscheint in Session-Liste und Vergleichsansichten
 */

export const SCENARIO_STATUS = {
  DRAFT: "DRAFT",
  SAVED: "SAVED",
} as const;

export type ScenarioStatus = (typeof SCENARIO_STATUS)[keyof typeof SCENARIO_STATUS];

export type ScenarioCapability = "edit" | "save" | "delete" | "duplicate" | "export";

const CAPABILITIES: Record<ScenarioStatus, ReadonlySet<ScenarioCapability>> = {
  // DRAFT kann auch gelöscht werden (= verwerfen), damit ist Löschen in jedem Status möglich.
  [SCENARIO_STATUS.DRAFT]: new Set<ScenarioCapability>(["edit", "save", "delete"]),
  [SCENARIO_STATUS.SAVED]: new Set<ScenarioCapability>(["edit", "delete", "duplicate", "export"]),
};

export function hasScenarioCapability(
  status: ScenarioStatus,
  capability: ScenarioCapability,
): boolean {
  return CAPABILITIES[status].has(capability);
}

export function isScenarioPersisted(status: ScenarioStatus): boolean {
  return status === SCENARIO_STATUS.SAVED;
}

export function assertValidScenarioStatus(value: string): asserts value is ScenarioStatus {
  if (value !== SCENARIO_STATUS.DRAFT && value !== SCENARIO_STATUS.SAVED) {
    throw new Error(`Ungültiger ScenarioStatus: ${value}`);
  }
}
