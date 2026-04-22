import type { ScenarioStatus } from "../const/state-machine";

/** Basis-Felder eines Scenarios (aus `get_scenarios`-RPC). */
export interface ScenarioListItem {
  id: string;
  session_id: string;
  name: string;
  status: ScenarioStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Config-Felder, die vom UI-Editor verstanden werden. Die `scenarios.config`-
 * Spalte ist ein offenes jsonb — spätere Optimierer-Varianten können zusätzliche
 * Felder hinzufügen, ohne die bestehenden zu invalidieren.
 */
export interface ScenarioConfig {
  /** ISINs der aus dem Session-Universum ausgewählten Bonds. */
  selectedIsins?: string[];
  [key: string]: unknown;
}

export interface ScenarioDetail extends ScenarioListItem {
  config: ScenarioConfig;
  result: unknown[];
  stats: Record<string, unknown>;
}
