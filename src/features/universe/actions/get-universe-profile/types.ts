import type { z } from "zod";

import type { UniverseProfileDetail } from "../../types/universe-profile";
import type { getUniverseProfileSchema } from "./schema";

export type GetUniverseProfileInput = z.input<typeof getUniverseProfileSchema>;

export type GetUniverseProfileResult =
  | { data: UniverseProfileDetail | null; error?: never }
  | { data?: never; error: string };
