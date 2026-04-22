import type { z } from "zod";

import type { deleteUniverseProfileSchema } from "./schema";

export type DeleteUniverseProfileInput = z.input<typeof deleteUniverseProfileSchema>;

export type DeleteUniverseProfileResult =
  | { data: { success: true }; error?: never }
  | { data?: never; error: string };
