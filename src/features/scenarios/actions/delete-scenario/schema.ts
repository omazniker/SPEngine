import { z } from "zod";

import { uuid } from "@/lib/schema-helpers";

export const deleteScenarioSchema = z.object({
  scenarioId: uuid,
  sessionId: uuid.optional(),
});
