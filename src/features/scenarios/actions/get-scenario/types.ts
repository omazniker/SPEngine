import type { z } from "zod";

import type { ScenarioDetail } from "../../types/scenario";
import type { getScenarioSchema } from "./schema";

export type GetScenarioInput = z.input<typeof getScenarioSchema>;

export type GetScenarioResult =
  | { data: ScenarioDetail | null; error?: never }
  | { data?: never; error: string };
