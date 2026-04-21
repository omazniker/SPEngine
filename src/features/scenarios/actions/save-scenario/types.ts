import type { z } from "zod";

import type { saveScenarioSchema } from "./schema";

export type SaveScenarioInput = z.input<typeof saveScenarioSchema>;

export type SaveScenarioResult =
  | { data: { scenarioId: string }; error?: never }
  | { data?: never; error: string };
