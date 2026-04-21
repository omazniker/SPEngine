# Supabase RPC-Referenz

> Zentrale Liste aller RPC-Funktionen, die von Server Actions aufgerufen werden dürfen (AGENTS.md §"Modulare Datenschicht").

## Ebenen-Modell

- **Ebene 1 — Atomar:** macht genau eine Sache, wiederverwendbar.
- **Ebene 2 — Komponiert:** ruft atomare RPCs intern auf, mit `include_*`-Flags je nach Aufrufer.
- **Ebene 3 — Server Action:** TypeScript-Wrapper, Auth-Check + `revalidatePath`.

## Aktuell (Stand 2026-04-21)

### Sessions

| RPC | Ebene | Args | Returns | Zweck |
|-----|-------|------|---------|-------|
| `get_sessions()` | 1 | — | `id, name, status, scenario_count, created_at, updated_at` | Liste der eigenen Sessions |
| `get_session_core(id)` | 1 | `p_session_id uuid` | `jsonb` | Session-Kern-Felder |
| `get_session_scenarios(id)` | 1 | `p_session_id uuid` | `jsonb[]` | Szenarien einer Session |
| `get_session(id, include_scenarios)` | 2 | `p_session_id uuid, p_include_scenarios boolean` | `jsonb` | Detail + optional Szenarien |

Alle RPCs `STABLE SECURITY INVOKER` mit `search_path = public`. RLS erzwingt Ownership auf Table-Ebene — RPCs filtern zusätzlich per `auth.uid()` im WHERE.

### Noch zu implementieren

| RPC | Ebene | Zweck |
|-----|-------|-------|
| `create_session(name)` | 3→1 | INSERT + return id (ersetzt aktuelles `.from("sessions").insert()` in Action) |
| `archive_session(id)`, `restore_session(id)` | 1 | Status-Übergänge (SESSION_STATUS) |
| `create_scenario(session_id, name, config)` | 1 | DRAFT-Scenario |
| `save_scenario(id)` | 1 | DRAFT → SAVED |
| `get_scenarios(session_id)` | 1 | Liste je Session |
| `get_scenario(id, include_bonds)` | 2 | Detail mit optional full Bond-Liste |

## Aufruf-Pattern in Actions

```typescript
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

export async function archiveSessionAction(sessionId: string) {
  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("archive_session", { p_session_id: sessionId });
  if (error) return { error: error.message };
  return { data };
}
```

## Regeln

1. **Nur RPCs lesen / komplexe Mutationen** — simple INSERTs können via `.from().insert()` laufen, **aber** sobald Business-Logik dazukommt (Status-Checks, Aggregat-Invarianten, Kaskaden) → RPC mit SECURITY DEFINER.
2. **Parameter-Präfix `p_`** (Postgres-Konvention, verhindert Kollision mit Column-Namen).
3. **Returns `jsonb`** für komponierte RPCs — erlaubt flexiblen Aufbau ohne Type-Explosion.
4. **`SET search_path = public`** auf jeder Funktion (Security-Best-Practice, verhindert Schema-Hijack).
