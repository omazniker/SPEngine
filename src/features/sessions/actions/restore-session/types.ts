import type { z } from "zod";

import type { restoreSessionSchema } from "./schema";

export type RestoreSessionInput = z.input<typeof restoreSessionSchema>;

export type RestoreSessionResult =
  | { data: { sessionId: string }; error?: never }
  | { data?: never; error: string };
