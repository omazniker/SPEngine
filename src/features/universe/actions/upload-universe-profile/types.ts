import type { z } from "zod";

import type { uploadUniverseProfileSchema } from "./schema";

export type UploadUniverseProfileInput = z.input<typeof uploadUniverseProfileSchema>;

export type UploadUniverseProfileResult =
  | { data: { universeProfileId: string; bondCount: number }; error?: never }
  | { data?: never; error: string };
