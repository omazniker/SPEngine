import { z } from "zod";

import { uuid } from "@/lib/schema-helpers";

export const getScenariosSchema = z.object({
  sessionId: uuid,
});
