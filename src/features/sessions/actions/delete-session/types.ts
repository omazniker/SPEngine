import type { z } from "zod";

import type { deleteSessionSchema } from "./schema";

export type DeleteSessionInput = z.input<typeof deleteSessionSchema>;

export type DeleteSessionResult =
  | { data: { sessionId: string }; error?: never }
  | { data?: never; error: string };
