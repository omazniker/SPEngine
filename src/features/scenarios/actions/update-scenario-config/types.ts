import type { z } from "zod";

import type { updateScenarioConfigSchema } from "./schema";

export type UpdateScenarioConfigInput = z.input<typeof updateScenarioConfigSchema>;

export type UpdateScenarioConfigResult =
  | { data: { success: true }; error?: never }
  | { data?: never; error: string };
