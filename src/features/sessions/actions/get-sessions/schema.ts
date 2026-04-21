import { z } from "zod";

/** `get_sessions` RPC ist parameterlos — Schema ist leer. Für Konsistenz trotzdem vorhanden. */
export const getSessionsSchema = z.object({}).strict();
