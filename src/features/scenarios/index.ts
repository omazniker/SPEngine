/**
 * Public API des `scenarios`-Features.
 */
export {
  SCENARIO_STATUS,
  assertValidScenarioStatus,
  hasScenarioCapability,
  isScenarioPersisted,
  type ScenarioCapability,
  type ScenarioStatus,
} from "./const/state-machine";

export { getScenariosAction } from "./actions/get-scenarios";
export { getScenariosSchema } from "./actions/get-scenarios/schema";
export type {
  GetScenariosInput,
  GetScenariosResult,
} from "./actions/get-scenarios/types";

export { getScenarioAction } from "./actions/get-scenario";
export { getScenarioSchema } from "./actions/get-scenario/schema";
export type {
  GetScenarioInput,
  GetScenarioResult,
} from "./actions/get-scenario/types";

export { createScenarioAction } from "./actions/create-scenario";
export { createScenarioSchema } from "./actions/create-scenario/schema";
export type {
  CreateScenarioInput,
  CreateScenarioResult,
} from "./actions/create-scenario/types";

export { saveScenarioAction } from "./actions/save-scenario";
export { saveScenarioSchema } from "./actions/save-scenario/schema";
export type {
  SaveScenarioInput,
  SaveScenarioResult,
} from "./actions/save-scenario/types";

export { deleteScenarioAction } from "./actions/delete-scenario";
export { deleteScenarioSchema } from "./actions/delete-scenario/schema";
export type {
  DeleteScenarioInput,
  DeleteScenarioResult,
} from "./actions/delete-scenario/types";

export type { ScenarioDetail, ScenarioListItem } from "./types/scenario";
