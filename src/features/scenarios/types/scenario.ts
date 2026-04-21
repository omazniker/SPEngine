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

export interface ScenarioDetail extends ScenarioListItem {
  config: Record<string, unknown>;
  result: unknown[];
  stats: Record<string, unknown>;
}
