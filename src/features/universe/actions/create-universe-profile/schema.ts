import { z } from "zod";

export const createUniverseProfileSchema = z.object({
  name: z
    .string({ error: "Name erforderlich" })
    .min(1, "Name darf nicht leer sein")
    .max(120, "Name maximal 120 Zeichen"),
  bonds: z.array(z.record(z.string(), z.unknown())).optional(),
  sourceFile: z.string().max(255).optional(),
});
