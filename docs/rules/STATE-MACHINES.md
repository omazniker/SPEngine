# State Machines

> Zentrale Regel aus `AGENTS.md`: **JEDE Entity mit Status-Lifecycle MUSS eine State Machine in `src/features/[feature]/const/state-machine.ts` haben.** Nie hardcoded Status-Strings in Components/Actions/RPCs.

## Warum

- **Single Source of Truth:** Erlaubte Status, erlaubte Übergänge und Capabilities (was darf der User im Status X tun?) leben an einer Stelle.
- **Typ-Sicherheit:** `as const`-Objekt + abgeleiteter Union-Typ — TypeScript fängt falsche Status-Werte beim Compilieren.
- **Plattform-Parität:** Dieselbe Logik ist in RPCs replizierbar (DB ist Single Source of Truth für Berechtigungen — Client-Capability ist nur UI-Hint).

## Anatomie (Pflicht-Skelett)

```typescript
// src/features/scenarios/const/state-machine.ts

export const SCENARIO_STATUS = {
  DRAFT: "DRAFT",
  SAVED: "SAVED",
} as const;

export type ScenarioStatus = (typeof SCENARIO_STATUS)[keyof typeof SCENARIO_STATUS];

export type ScenarioCapability = "edit" | "save" | "delete" | "duplicate" | "export";

const CAPABILITIES: Record<ScenarioStatus, ReadonlySet<ScenarioCapability>> = {
  [SCENARIO_STATUS.DRAFT]: new Set(["edit", "save"]),
  [SCENARIO_STATUS.SAVED]: new Set(["edit", "delete", "duplicate", "export"]),
};

export function hasScenarioCapability(status: ScenarioStatus, cap: ScenarioCapability): boolean {
  return CAPABILITIES[status].has(cap);
}

export function isScenarioPersisted(status: ScenarioStatus): boolean {
  return status === SCENARIO_STATUS.SAVED;
}

export function assertValidScenarioStatus(value: string): asserts value is ScenarioStatus {
  if (value !== SCENARIO_STATUS.DRAFT && value !== SCENARIO_STATUS.SAVED) {
    throw new Error(`Ungültiger ScenarioStatus: ${value}`);
  }
}
```

**Mindestumfang:**
1. `*_STATUS` Konstanten-Objekt (`as const`)
2. Abgeleiteter `*Status`-Union-Typ
3. `*Capability`-Union (was darf getan werden)
4. Capability-Map (`Record<Status, ReadonlySet<Capability>>`)
5. `has*Capability(status, cap)`-Funktion
6. `assertValid*Status(value)`-Assertion für Runtime-Checks (z.B. bei DB-Reads)

## Public API

Status + Funktionen werden über den Feature-Barrel exponiert:

```typescript
// src/features/scenarios/index.ts
export {
  SCENARIO_STATUS,
  hasScenarioCapability,
  isScenarioPersisted,
  assertValidScenarioStatus,
  type ScenarioStatus,
  type ScenarioCapability,
} from "./const/state-machine";
```

Externe Imports IMMER über `@/features/scenarios`, nie direkt über `const/state-machine`.

## Verboten / Erlaubt

```typescript
// ❌ VERBOTEN — hardcoded String
if (scenario.status === "DRAFT") { ... }

// ❌ VERBOTEN — Status-Array in Component
const canEdit = ["DRAFT", "SAVED"].includes(scenario.status);

// ❌ VERBOTEN — Capability-Check durch String-Vergleich
if (scenario.status !== "DRAFT") { disabled = true; }

// ✅ RICHTIG — Capability-Funktion
import { hasScenarioCapability, SCENARIO_STATUS } from "@/features/scenarios";

if (scenario.status === SCENARIO_STATUS.DRAFT) { ... }
const canEdit = hasScenarioCapability(scenario.status, "edit");
```

## Bestehende State Machines

| Entity | Datei | Status | Capabilities |
|--------|-------|--------|--------------|
| Scenario | `src/features/scenarios/const/state-machine.ts` | DRAFT, SAVED | edit, save, delete, duplicate, export |
| Session | `src/features/sessions/const/state-machine.ts` | ACTIVE, ARCHIVED | edit, run_optimizer, add_scenario, archive, restore, delete, export |

## Neue State Machine anlegen — Checkliste

1. Datei `src/features/[entity]/const/state-machine.ts` nach obigem Skelett.
2. Im Feature-Barrel (`src/features/[entity]/index.ts`) exportieren.
3. Wenn die Entity auch in der DB einen Status hat: Enum oder CHECK-Constraint in der Supabase-Migration anlegen, identische Werte.
4. In RPCs, die die Entity zurückgeben, Status + Capabilities als eigenes Feld mitliefern (Single Source of Truth in der DB).
5. In `AGENTS.md` die State-Machines-Tabelle um die neue Entity ergänzen.
