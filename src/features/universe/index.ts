/**
 * Public API des `universe`-Features. UniverseProfiles sind immutable Bond-Snapshots
 * (Aggregatwurzel) — nur Create, Read, Delete.
 */

export { getUniverseProfilesAction } from "./actions/get-universe-profiles";
export type { GetUniverseProfilesResult } from "./actions/get-universe-profiles/types";

export { createUniverseProfileAction } from "./actions/create-universe-profile";
export { createUniverseProfileSchema } from "./actions/create-universe-profile/schema";
export type {
  CreateUniverseProfileInput,
  CreateUniverseProfileResult,
} from "./actions/create-universe-profile/types";

export type {
  UniverseBond,
  UniverseProfileDetail,
  UniverseProfileListItem,
} from "./types/universe-profile";
