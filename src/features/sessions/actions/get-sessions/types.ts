import type { SessionListItem } from "../../types/session";

export type GetSessionsResult =
  | { data: SessionListItem[]; error?: never }
  | { data?: never; error: string };
