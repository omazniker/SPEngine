import { z } from "zod";

import { uuid } from "@/lib/schema-helpers";

export const archiveSessionSchema = z.object({ sessionId: uuid });
