import { z } from "zod";

export const updateScenarioConfigSchema = z.object({
  scenarioId: z.string().uuid("Ungültige Scenario-ID"),
  config: z.object({
    selectedIsins: z.array(z.string().min(1)).optional(),
  }).passthrough(),
});
