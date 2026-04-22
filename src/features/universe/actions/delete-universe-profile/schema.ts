import { z } from "zod";

export const deleteUniverseProfileSchema = z.object({
  universeProfileId: z.string().uuid("Ungültige Universe-Profile-ID"),
});
