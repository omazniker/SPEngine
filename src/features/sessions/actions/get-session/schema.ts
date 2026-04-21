import { z } from "zod";

import { uuid } from "@/lib/schema-helpers";

export const getSessionSchema = z.object({
  sessionId: uuid,
  includeScenarios: z.boolean().optional().default(false),
});
