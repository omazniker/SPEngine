import { z } from "zod";

export const getUniverseProfileSchema = z.object({
  universeProfileId: z.string().uuid("Ungültige Universe-Profile-ID"),
});
