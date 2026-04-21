import { z } from "zod";

import { uuid } from "@/lib/schema-helpers";

export const saveScenarioSchema = z.object({
  scenarioId: uuid,
  /** sessionId optional — wird für revalidatePath benötigt, kann aus Context mitkommen. */
  sessionId: uuid.optional(),
});
