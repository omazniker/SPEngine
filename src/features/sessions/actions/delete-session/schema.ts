import { z } from "zod";

import { uuid } from "@/lib/schema-helpers";

export const deleteSessionSchema = z.object({ sessionId: uuid });
