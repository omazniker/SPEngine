import type { z } from "zod";

import type { ScenarioListItem } from "../../types/scenario";
import type { getScenariosSchema } from "./schema";

export type GetScenariosInput = z.input<typeof getScenariosSchema>;

export type GetScenariosResult =
  | { data: ScenarioListItem[]; error?: never }
  | { data?: never; error: string };
