/**
 * Public API des `sessions`-Features. Nur Symbole, die von außen erreichbar
 * sein sollen, hier re-exportieren.
 */
export {
  SESSION_STATUS,
  assertValidSessionStatus,
  hasSessionCapability,
  isSessionEditable,
  type SessionCapability,
  type SessionStatus,
} from "./const/state-machine";

export { getSessionsAction } from "./actions/get-sessions";
export type { GetSessionsResult } from "./actions/get-sessions/types";

export { getSessionAction } from "./actions/get-session";
export { getSessionSchema } from "./actions/get-session/schema";
export type {
  GetSessionInput,
  GetSessionResult,
} from "./actions/get-session/types";

export { createSessionAction } from "./actions/create-session";
export { createSessionSchema } from "./actions/create-session/schema";
export type {
  CreateSessionInput,
  CreateSessionResult,
} from "./actions/create-session/types";

export { archiveSessionAction } from "./actions/archive-session";
export { archiveSessionSchema } from "./actions/archive-session/schema";
export type {
  ArchiveSessionInput,
  ArchiveSessionResult,
} from "./actions/archive-session/types";

export { restoreSessionAction } from "./actions/restore-session";
export { restoreSessionSchema } from "./actions/restore-session/schema";
export type {
  RestoreSessionInput,
  RestoreSessionResult,
} from "./actions/restore-session/types";

export { deleteSessionAction } from "./actions/delete-session";
export { deleteSessionSchema } from "./actions/delete-session/schema";
export type {
  DeleteSessionInput,
  DeleteSessionResult,
} from "./actions/delete-session/types";

export type { ScenarioSummary, SessionDetail, SessionListItem } from "./types/session";
