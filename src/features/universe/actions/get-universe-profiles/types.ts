import type { UniverseProfileListItem } from "../../types/universe-profile";

export type GetUniverseProfilesResult =
  | { data: UniverseProfileListItem[]; error?: never }
  | { data?: never; error: string };
