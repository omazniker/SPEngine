import type { z } from "zod";

import type { archiveSessionSchema } from "./schema";

export type ArchiveSessionInput = z.input<typeof archiveSessionSchema>;

export type ArchiveSessionResult =
  | { data: { sessionId: string }; error?: never }
  | { data?: never; error: string };
