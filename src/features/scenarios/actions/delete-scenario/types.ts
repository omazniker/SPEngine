import type { z } from "zod";

import type { deleteScenarioSchema } from "./schema";

export type DeleteScenarioInput = z.input<typeof deleteScenarioSchema>;

export type DeleteScenarioResult =
  | { data: { scenarioId: string }; error?: never }
  | { data?: never; error: string };
