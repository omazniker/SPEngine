import type { z } from "zod";

import type { SessionDetail } from "../../types/session";
import type { getSessionSchema } from "./schema";

export type GetSessionInput = z.input<typeof getSessionSchema>;

export type GetSessionResult =
  | { data: SessionDetail | null; error?: never }
  | { data?: never; error: string };
