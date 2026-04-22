import type { z } from "zod";

import type { createUniverseProfileSchema } from "./schema";

export type CreateUniverseProfileInput = z.input<typeof createUniverseProfileSchema>;

export type CreateUniverseProfileResult =
  | { data: { universeProfileId: string }; error?: never }
  | { data?: never; error: string };
