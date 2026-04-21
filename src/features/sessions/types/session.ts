import type { SessionStatus } from "../const/state-machine";

/** Basis-Felder einer Session, wie sie von `get_sessions`-RPC geliefert werden. */
export interface SessionListItem {
  id: string;
  name: string;
  status: SessionStatus;
  scenario_count: number;
  created_at: string;
  updated_at: string;
}

export interface SessionDetail extends SessionListItem {
  user_id: string;
  universe_profile_id: string | null;
  data: Record<string, unknown>;
  scenarios?: ScenarioSummary[];
}

export interface ScenarioSummary {
  id: string;
  session_id: string;
  name: string;
  status: "DRAFT" | "SAVED";
  created_at: string;
  updated_at: string;
}
