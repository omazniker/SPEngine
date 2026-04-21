/**
 * State Machine für Sessions (AGENTS.md §"State Machines").
 * Single Source of Truth — keine hardcoded Status-Strings anderswo.
 *
 * Session-Lebenszyklus:
 *   ACTIVE → ARCHIVED
 *
 * ACTIVE: Aktuelle Arbeitssession, Edit-fähig, erscheint in der Hauptliste
 * ARCHIVED: Eingefroren, read-only, landet im Archiv (kein Optimizer-Lauf mehr möglich)
 */

export const SESSION_STATUS = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

export type SessionCapability =
  | "edit"
  | "run_optimizer"
  | "add_scenario"
  | "archive"
  | "restore"
  | "delete"
  | "export";

const CAPABILITIES: Record<SessionStatus, ReadonlySet<SessionCapability>> = {
  [SESSION_STATUS.ACTIVE]: new Set<SessionCapability>([
    "edit",
    "run_optimizer",
    "add_scenario",
    "archive",
    "delete",
    "export",
  ]),
  [SESSION_STATUS.ARCHIVED]: new Set<SessionCapability>(["restore", "delete", "export"]),
};

export function hasSessionCapability(status: SessionStatus, capability: SessionCapability): boolean {
  return CAPABILITIES[status].has(capability);
}

export function isSessionEditable(status: SessionStatus): boolean {
  return status === SESSION_STATUS.ACTIVE;
}

export function assertValidSessionStatus(value: string): asserts value is SessionStatus {
  if (value !== SESSION_STATUS.ACTIVE && value !== SESSION_STATUS.ARCHIVED) {
    throw new Error(`Ungültiger SessionStatus: ${value}`);
  }
}
