import type { z } from "zod";

import type { createSessionSchema } from "./schema";

export type CreateSessionInput = z.input<typeof createSessionSchema>;

export type CreateSessionResult =
  | { data: { sessionId: string }; error?: never }
  | { data?: never; error: string };
