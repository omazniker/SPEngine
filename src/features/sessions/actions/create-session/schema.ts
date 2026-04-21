import { z } from "zod";

export const createSessionSchema = z.object({
  name: z
    .string({ error: "Name erforderlich" })
    .min(1, "Name darf nicht leer sein")
    .max(120, "Name maximal 120 Zeichen"),
});
