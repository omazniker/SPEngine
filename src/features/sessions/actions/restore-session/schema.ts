import { z } from "zod";

import { uuid } from "@/lib/schema-helpers";

export const restoreSessionSchema = z.object({ sessionId: uuid });
