# Server Actions

> Zentrale Regel aus `AGENTS.md`: Server Actions sind die **einzige API** zwischen Client und Supabase. Nie direkte Supabase-Calls vom Client für DB-Reads/Writes.

## 3-File Pattern

Jede Action liegt in `src/features/[feature]/actions/[verb]-[resource]/`:

```
actions/create-scenario/
├── index.ts        # "use server" Handler
├── schema.ts       # Zod-Schemas
└── types.ts        # TypeScript-Types (Input/Output)
```

### `schema.ts`

```typescript
import { z } from "zod";

export const createScenarioSchema = z.object({
  sessionId: z.string().uuid(),
  name: z.string().min(1).max(120),
  config: z.object({ ... }),
});
```

### `types.ts`

```typescript
import type { z } from "zod";

import type { createScenarioSchema } from "./schema";

export type CreateScenarioInput = z.input<typeof createScenarioSchema>;
export type CreateScenarioOutput = { data: { scenarioId: string } } | { error: string };
```

### `index.ts`

```typescript
"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import { createScenarioSchema } from "./schema";
import type { CreateScenarioInput, CreateScenarioOutput } from "./types";

export async function createScenarioAction(
  input: CreateScenarioInput,
): Promise<CreateScenarioOutput> {
  const parsed = createScenarioSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  const { supabase } = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("create_scenario", {
    p_session_id: parsed.data.sessionId,
    p_name: parsed.data.name,
    p_config: parsed.data.config,
  });

  if (error) return { error: error.message };

  revalidatePath(`/sessions/${parsed.data.sessionId}`);
  return { data: { scenarioId: data as string } };
}
```

## Regeln

1. **`redirect()` IMMER außerhalb von `try/catch`** und als letzte Anweisung. `redirect` wirft intern, ein try/catch würde das fangen und die Navigation verschlucken.
2. **Schreibende Actions:** Validierung über Capability-RPCs (DB = Single Source of Truth für Berechtigungen). Nicht im TS-Code duplizieren.
3. **Lesende Actions:** NUR `supabase.rpc()` Aufrufe, keine eigenen Queries (`.from("tbl").select()` ist verboten).
4. **Fehler-Format:** Immer `{ data, error? }` oder `{ error }` — nie exceptions werfen, immer serialisierbar.
5. **Revalidation:** `revalidatePath` je nach Scope (Layout vs. Page). Bei globalen Änderungen: `revalidatePath("/", "layout")`.

## Anti-Patterns

```typescript
// ❌ VERBOTEN — eigene Query in Action
const { data } = await supabase.from("scenarios").select("*").eq("id", id);

// ❌ VERBOTEN — Redirect im try/catch
try {
  await createScenario(...);
  redirect("/sessions/" + id);  // wird von catch gefangen, Navigation failt
} catch (err) {
  return { error: err.message };
}

// ❌ VERBOTEN — Throwen statt return { error }
if (!parsed.success) throw new Error("Invalid input");

// ✅ RICHTIG
const result = await createScenario(...);
if ("error" in result) return result;
redirect(`/sessions/${result.data.scenarioId}`);
```

## Tests

E2E prüft die Action über den UI-Flow (GenericForm → Action → DB-Verify via db-helpers).
Unit-Tests für Actions ohne Supabase-Dependency sind optional — meistens reicht E2E.
