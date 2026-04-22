import { z } from "zod";

/**
 * Server-Action-Input. `file` wird über FormData transportiert, `name`
 * separat als String-Feld. Die Action parst selbst kein FormData — der
 * Caller muss die Felder extrahieren und ins Schema schicken.
 */
export const uploadUniverseProfileSchema = z.object({
  name: z
    .string({ error: "Name erforderlich" })
    .min(1, "Name darf nicht leer sein")
    .max(120, "Name maximal 120 Zeichen"),
  sourceFile: z.string().max(255).optional(),
  bondsJson: z.string().min(2, "Bonds-JSON fehlt"),
});
