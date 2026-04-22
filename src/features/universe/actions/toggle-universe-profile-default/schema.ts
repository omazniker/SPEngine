import { z } from "zod";

export const toggleUniverseProfileDefaultSchema = z.object({
  universeProfileId: z.string().uuid("Ungültige Universe-Profile-ID"),
});
