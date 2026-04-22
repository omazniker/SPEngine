/**
 * Public API des `universe`-Features. UniverseProfiles sind immutable Bond-Snapshots
 * (Aggregatwurzel) — nur Create, Read, Delete.
 */

export { getUniverseProfilesAction } from "./actions/get-universe-profiles";
export type { GetUniverseProfilesResult } from "./actions/get-universe-profiles/types";

export { getUniverseProfileAction } from "./actions/get-universe-profile";
export { getUniverseProfileSchema } from "./actions/get-universe-profile/schema";
export type {
  GetUniverseProfileInput,
  GetUniverseProfileResult,
} from "./actions/get-universe-profile/types";

export { createUniverseProfileAction } from "./actions/create-universe-profile";
export { createUniverseProfileSchema } from "./actions/create-universe-profile/schema";
export type {
  CreateUniverseProfileInput,
  CreateUniverseProfileResult,
} from "./actions/create-universe-profile/types";

export { uploadUniverseProfileAction } from "./actions/upload-universe-profile";
export { uploadUniverseProfileSchema } from "./actions/upload-universe-profile/schema";
export type {
  UploadUniverseProfileInput,
  UploadUniverseProfileResult,
} from "./actions/upload-universe-profile/types";

export { deleteUniverseProfileAction } from "./actions/delete-universe-profile";
export { deleteUniverseProfileSchema } from "./actions/delete-universe-profile/schema";
export type {
  DeleteUniverseProfileInput,
  DeleteUniverseProfileResult,
} from "./actions/delete-universe-profile/types";

export { toggleUniverseProfileDefaultAction } from "./actions/toggle-universe-profile-default";
export { toggleUniverseProfileDefaultSchema } from "./actions/toggle-universe-profile-default/schema";
export type {
  ToggleUniverseProfileDefaultInput,
  ToggleUniverseProfileDefaultResult,
} from "./actions/toggle-universe-profile-default/types";

export { parseUniverseXlsx } from "./utils/parse-universe-xlsx";

export type {
  UniverseBond,
  UniverseProfileDetail,
  UniverseProfileListItem,
} from "./types/universe-profile";
