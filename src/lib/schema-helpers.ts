import { z } from "zod";

/**
 * Zentrale Zod-Helpers. Siehe AGENTS.md §"Zentrale Utilities":
 * - Keine `.transform(val => new Date(val))`-Kopien in Feature-Schemas
 * - dateTransform ist die Single Source of Truth für Date-Parsing
 */

/** String → Date. Validiert auf nicht-leer + parsebar. */
export const dateTransform = z
  .string()
  .min(1, "Datum erforderlich")
  .transform((val, ctx) => {
    const date = new Date(val);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Ungültiges Datum" });
      return z.NEVER;
    }
    return date;
  });

/** Wie dateTransform, aber optional. Leerer String → undefined. */
export const optionalDateTransform = z
  .string()
  .optional()
  .transform((val, ctx) => {
    if (!val) return undefined;
    const date = new Date(val);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Ungültiges Datum" });
      return z.NEVER;
    }
    return date;
  });

/** Wandelt leere Strings in undefined um (nützlich für optionale Textfelder). */
export const emptyStringToUndefined = z
  .string()
  .optional()
  .transform((val) => (val === undefined || val === "" ? undefined : val));

/** Zahl aus String (aus Form-Inputs). */
export const numericString = z
  .string()
  .min(1, "Wert erforderlich")
  .transform((val, ctx) => {
    const normalized = val.replace(/\./g, "").replace(",", ".");
    const num = Number(normalized);
    if (Number.isNaN(num)) {
      ctx.addIssue({ code: "custom", message: "Keine gültige Zahl" });
      return z.NEVER;
    }
    return num;
  });

/** UUID-Validierung mit deutscher Fehlermeldung. */
export const uuid = z.string().uuid({ message: "Ungültige UUID" });
