import { z } from "zod";

import { uuid } from "@/lib/schema-helpers";

export const createScenarioSchema = z.object({
  sessionId: uuid,
  name: z.string().min(1, "Name darf nicht leer sein").max(120, "Name maximal 120 Zeichen"),
  config: z.record(z.string(), z.unknown()).optional(),
});
