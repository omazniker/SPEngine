import type { z } from "zod";

import type { toggleUniverseProfileDefaultSchema } from "./schema";

export type ToggleUniverseProfileDefaultInput = z.input<typeof toggleUniverseProfileDefaultSchema>;

export type ToggleUniverseProfileDefaultResult =
  | { data: { isDefault: boolean }; error?: never }
  | { data?: never; error: string };
