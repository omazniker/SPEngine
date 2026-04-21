import type { z } from "zod";

import type { createScenarioSchema } from "./schema";

export type CreateScenarioInput = z.input<typeof createScenarioSchema>;

export type CreateScenarioResult =
  | { data: { scenarioId: string }; error?: never }
  | { data?: never; error: string };
