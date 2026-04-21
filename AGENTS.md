<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — SPEngine (Next.js Alternative)

## Kontext

**Dies ist ein Test-/Alternativ-Projekt.** Die produktive SPEngine-Lösung (Single-File React-App `/opt/spengine/index.html` + Express-Backend in `/opt/spengine/server/`) bleibt unverändert live. Hier wird parallel eine Next.js-basierte Alternative aufgebaut. **Kein Deploy in Produktion**, kein Überschreiben von `/opt/spengine/*`.

- **Repo-Pfad:** `/srv/src/spengine-next/`
- **Produktion (unangetastet):** `/opt/spengine/` — Deploy via `spengine-deploy`
- **Deploy dieser Alternative:** noch nicht festgelegt

## Stack & Commands

**Stack:** Next.js 16 (App Router, Turbopack), React 19.2, TypeScript 5, Tailwind CSS 4, Supabase (`@supabase/supabase-js` + `@supabase/ssr`), shadcn/ui (base-ui), React Query 5, Zustand 5, Zod 4

**Auth:** Next.js 16 Proxy-Pattern (`src/proxy.ts`) für Supabase Session-Refresh.

```bash
npm run dev          # Dev-Server (localhost:3000, Turbopack)
npm run build        # Production Build
npm run lint         # ESLint 9
npm run typecheck    # TypeScript Check (tsc --noEmit)
npm run gen:types    # Supabase Types → src/types/supabase.ts (SUPABASE_PROJECT_ID env gesetzt)
```

## Project Structure

### Domäne (abgeleitet aus `/opt/spengine/` 2026-04-21)

SPEngine ist ein **Bond-Portfolio-Optimierungs-Tool**: Bonds laden → Constraints setzen → Solver (HiGHS MIP v2 / Greedy) → Portfolio als Szenario speichern → vergleichen/exportieren.

| Entity | Zweck | Lifecycle |
|--------|-------|-----------|
| **Bond** | Einzelne Anleihe (ISIN, Kurs, Rating, YTM, ESG, Risiko — Bloomberg-Daten) | Immutable (aus XLSX) |
| **UniverseProfile** | Bündel von Bonds (z.B. "universum_neu.xlsx", 1.643 Bonds) | Active / Archived |
| **Portfolio** | Optimizer-Output (Positionen + Gewichtung + Stats) | Ephemeral → als `Scenario.result` persistiert |
| **Scenario** | Benannte Portfolio-Variante (Config + Result + Stats) | **Draft → Saved** |
| **Session** | Aggregate: Portfolio + Constraints + Scenario-Liste + Metadaten | **Active → Archived** |
| **Preset** | Constraint-Template (z.B. "Min Yield 3%", Rating-Floor) | Static (`is_default`) |
| **Setting** | Key-Value Konfiguration (UI-Prefs, Global Defaults) | Key-Value Store |

**Beziehungen:**
- `UniverseProfile 1 ──→ N Bond` (snapshot)
- `Session 1 ──→ N Scenario`, `Session 1 ──→ 1 Portfolio` (embedded)
- `Scenario N ──→ N Bond` (via `result`), `Scenario 1 ──→ 1 Preset` (optional config-ref)

**Aggregatwurzeln:** `Session` (enthält Portfolio + Scenarios als Transaktions-Einheit) und `UniverseProfile` (immutable Bond-Snapshot).

**Rollen:** Das originale SPEngine ist **Single-User** (keine Auth, keine Rollen). Der Next.js-Aufbau kann optional Multi-User via Supabase Auth bekommen (`user_id` auf jeder Tabelle, RLS je `auth.uid()`). Die E2E-`buyer/supplier/approver`-Rollen aus `test-data-factory.ts` bleiben Template für spätere SaaS-Erweiterung und sind nicht an die SPEngine-Domäne gebunden.

**Quellen:** `/opt/spengine/server/` (Express-Routes), `/opt/spengine/data/` (Excel-Snapshots), `/opt/spengine/DOKUMENTATION.md`.

```
src/features/[feature]/
├── actions/[verb]-[resource]/   # Server Actions (3-file pattern)
├── components/                  # Feature-Komponenten
├── hooks/                       # useQuery/useMutation Wrapper
├── types/                       # TypeScript Definitionen
├── const/                       # Konstanten + State Machines
├── utils/                       # Pure Helper-Funktionen
└── index.ts                     # Public API — einziger Import-Punkt
```

**Import-Regel:** NUR von `features/[feature]/index.ts` importieren, nie aus internen Ordnern.
**Feature-Konsolidierung:** Zusammengehörige Logik in EIN Feature bündeln, nicht aufsplittten.

## Architektur-Regeln

### KRITISCH: DRY — Zentrale Lösungen, keine verteilte Logik

- **Eine Stelle für eine Entscheidung.** Geschäftslogik IMMER zentral: RPC, RLS-Policy, State Machine oder Utility.
- **DB-Ebene bevorzugen:** RLS, Trigger, SECURITY DEFINER — wirkt für ALLE Clients (Web, Mobile, API).
- **Mobile-Test:** Vor dem Implementieren fragen: "Muss eine Mobile-App das separat einbauen?" Wenn ja → Lösung ist falsch.
- **Kein Flickenteppich.** Lieber einmal richtig zentral als schnelle Fixes an 5 Stellen.
- **Komponenten wiederverwenden.** Vor Neuerstellung IMMER prüfen ob bestehende Komponente erweitert werden kann.

### KRITISCH: State Machines — Single Source of Truth für Status-Logik

> **Detaillierte Regeln + Beispiele:** `docs/rules/STATE-MACHINES.md` (noch anzulegen)

**JEDE Entity mit Status-Lifecycle MUSS eine State Machine in `const/` haben.** Nie hardcoded Status-Strings, Status-Arrays oder eigene Status-Listen in Components/Actions.

| Entity | State Machine | Import von |
|--------|--------------|------------|
| Scenario | `SCENARIO_STATUS`, `hasScenarioCapability`, `isScenarioPersisted` | `@/features/scenarios` |
| Session | `SESSION_STATUS`, `hasSessionCapability`, `isSessionEditable` | `@/features/sessions` |
| UniverseProfile | (geplant) | `@/features/universe` |

```typescript
// VERBOTEN — hardcoded Status
if (status === "DRAFT") { ... }
const canClose = ["DRAFT", "ACTIVE"].includes(entity.status);

// RICHTIG — State Machine
import { hasScenarioCapability } from "@/features/scenarios";
if (hasScenarioCapability(status, "save")) { ... }
```

### KRITISCH: Zentrale Utilities — keine lokalen Kopien

| Utility | Import | NICHT lokal definieren |
|---------|--------|-----------------------|
| `formatCurrency()` | `@/lib/format` | Kein `new Intl.NumberFormat(...)` in Komponenten |
| `formatDateTimeLocal()` | `@/lib/format` | Kein `.toISOString().slice(0, 16)` inline |
| `dateTransform` (Zod) | `@/lib/schema-helpers` | Keine `.transform(val => new Date(val)...)` in Schemas |
| `StatusBadge` | `@/components/ui/status-badge` | Neue Status-Badges als Wrapper um `StatusBadge` |

### Server/Client Boundary

- **Default = Server Component.** `createSupabaseServerClient()` aus `@/lib/supabase/supabase-server-client`
- **Client Component nur für:** Interaktivität, Hooks, Browser-APIs. Klein halten als "Client Islands".

### KRITISCH: Modulare Supabase-Datenschicht — Single Source of Truth für Daten

> **Alle Geschäftslogik und Query-Logik lebt in Supabase RPCs.** Web + Mobile nutzen dieselben RPCs. Keine Query-Logik in TypeScript.

#### Modulares RPC-Muster: Atomare Bausteine + Komponierte Wrapper

**Ebene 1 — Atomare RPCs** (machen EINE Sache, wiederverwendbar):
Beispiel: `get_[entity]_status(id)`, `get_[entity]_lines(id, context)`, `get_[entity]_documents(id, visibility)`, …

**Ebene 2 — Komponierte RPCs** (rufen atomare RPCs intern auf):
Beispiel: `get_[entity](id, include_*, …)` mit optionalen Modulen je Rolle.

**Ebene 3 — Server Actions** (dünne Wrapper):

```typescript
// RICHTIG — Action ruft nur RPC auf
const handler = async (data) => {
  const { supabase } = await createSupabaseServerClient();
  const { data: result, error } = await supabase.rpc("get_entity", {
    p_entity_id: data.entityId,
    p_include_lines: true,
  });
  return error ? { error: error.message } : { data: result };
};

// VERBOTEN — eigene Queries in Actions
const { data } = await supabase.from("entity_lines").select("*").eq("entity_id", id);
```

#### Neue Entity anlegen

1. **Atomare RPCs** erstellen: `get_[entity]_status()`, `get_[entity]_lines()`, etc.
2. **Komponierter Wrapper**: `get_[entity](id, include_*, …)`
3. **Rollen-spezifische Wrapper**: `get_[role]_[entity]()`
4. **Server Actions**: Dünne Wrapper (Auth + RPC + revalidatePath)
5. **Frage stellen:** "Muss eine Mobile-App das separat einbauen?" — Wenn ja, Logik in RPC verschieben.

### Data Flow

**Standard:** `page.tsx → Server Action → supabase.rpc() → Props → Client Component`
**Nur wenn nötig (Realtime, Optimistic):** `Client → React Query → Server Action → supabase.rpc()`

- Server Actions sind die einzige API — nie direkte Supabase-Calls vom Client
- `page.tsx` darf KEINE direkten Supabase-Queries enthalten — immer `get-[resource]` Actions nutzen
- **KEINE `.from("table").select()` in Actions** — immer RPCs nutzen
- React Query Keys: `["resource", { params }]`

### Server Actions

> **Detaillierte Patterns:** `docs/rules/SERVER-ACTIONS.md` (noch anzulegen)

3-File Pattern in `actions/[verb]-[resource]/`: `index.ts` (Handler), `schema.ts` (Zod), `types.ts` (Types).
`redirect()` IMMER außerhalb von `try/catch` und als letzte Anweisung.

**Schreibende Actions:** Validierung über zentrale Capability-RPCs (DB ist Single Source of Truth für Berechtigungen).
**Lesende Actions:** NUR `supabase.rpc()` Aufrufe, keine eigenen Queries.

### State Management (Priorität)

1. **URL State** — Filter, Tabs, Pagination
2. **Local State** (`useState`) — Single-Component UI
3. **Global UI** (`Zustand`) — Sheet open/close, Cross-Component
4. **Server Cache** (`React Query`) — DB-Daten. Nie in Zustand kopieren.

## UI Patterns

- **GenericForm PFLICHT** für alle Mutationen (`@/components/form/generic-form.tsx`)
- **DataTable PFLICHT** für alle Listen (`@/components/table/data-table.tsx`) mit klickbaren Rows
- **Sheets** via Zustand Stores (`createSheetStore` in `src/store/use-modals.ts`)
- **Dialoge IMMER via `AppDialog`** (`@/components/ui/app-dialog.tsx`) — NICHT den Shadcn-`Dialog` direkt
- **Suspense** mit dedizierten Skeleton-Komponenten (`@/components/ui/skeleton`), keine generischen Spinner
- **Design-System (PFLICHT):** `docs/rules/DESIGN-SYSTEM.md` — Tokens, Komponenten-Inventar, Wann-welche-Komponente. Alle Farben, Radien, Shadows AUSSCHLIESSLICH über Tokens in `src/app/globals.css`. Keine hardcoded Werte, keine Inline-Farben.
- **Styling/Farben/Badges:** siehe `docs/rules/STYLING.md`

### KRITISCH: AppDialog — Standard-Wrapper für alle Dialoge

**NIEMALS** den Shadcn-Standard `Dialog`/`DialogContent` aus `@/components/ui/dialog` direkt verwenden. Immer `AppDialog` aus `@/components/ui/app-dialog` nutzen. Der Standard-Dialog hat kaputte Größen-Presets (`full` = nur 1024px), Klassen-Kollisionen zwischen `size` und `className` und kein klares Layout-Modell für scrollbaren Body mit fixem Header/Footer.

**Anatomie:**

```tsx
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogBody,
  AppDialogFooter,
  AppDialogTitle,
  AppDialogDescription,
} from "@/components/ui/app-dialog";

<AppDialog open={open} onOpenChange={setOpen}>
  <AppDialogContent size="5xl" data-testid="my-feature-dialog">
    <AppDialogHeader>
      <AppDialogTitle>Titel</AppDialogTitle>
      <AppDialogDescription>Kurze Beschreibung</AppDialogDescription>
    </AppDialogHeader>
    <AppDialogBody className="space-y-6">
      {/* scrollt automatisch bei Überlauf, Header/Footer bleiben fixiert */}
    </AppDialogBody>
    <AppDialogFooter>
      <Button onClick={...}>Aktion</Button>
    </AppDialogFooter>
  </AppDialogContent>
</AppDialog>
```

**`size`-Prop — wähle bewusst:**

| Size | Breite | Anwendungsfall |
|------|--------|----------------|
| `sm` | 384px | Confirm-Dialoge, kurze Bestätigungen |
| `md` | 448px | Einfache Formulare (1-3 Felder) |
| `lg` | 512px | Standard-Formulare |
| `xl` | 576px | Komplexere Formulare |
| `2xl` | 672px | **Default** — Info-Dialoge, mittlere Formulare |
| `3xl` | 768px | Formulare mit Sections |
| `4xl` | 896px | Detail-Ansichten mit KPIs |
| `5xl` | 1024px | Listen/Tabellen mit wenigen Spalten |
| `6xl` | 1152px | Tabellen mit vielen Spalten (6+) |
| `7xl` | 1280px | Große Daten-Dashboards |
| `fit` | content-adaptive | Wenn Content die Breite bestimmen soll |
| `full` | Viewport-Rand | Maximale Fläche (z.B. Vergleichs-Ansichten) |

Alle Größen sind automatisch auf `calc(100vw-2rem)` / `calc(100vh-2rem)` gecappt — nichts läuft über.

**Layout-Regeln:**
- **Keine globale ScrollArea** im Dialog. Nur `AppDialogBody` scrollt (hat `overflow-y-auto`).
- **Header und Footer bleiben fixiert** beim Scrollen — Aktionen sind immer erreichbar.
- **Kein eigenes `className="max-w-..."`** auf `AppDialogContent` — nutze `size`. Für alles andere normales `className` verwenden.
- **`data-testid` Pflicht** auf `AppDialogContent` für E2E-Tests.

**Zustand-State:** Wenn der Dialog aus mehreren Stellen geöffnet wird, Store in `src/store/use-modals.ts` via `createSheetStore` (funktioniert auch für Dialoge). Für einfache Fälle (ein Trigger, lokaler State) reicht `useState` direkt.

## Component Best Practices

- **`data-testid` PFLICHT:** `[feature]-[action]-button`, `[feature]-row-{id}`, etc.
- Große Komponenten (>200 Zeilen) → Sub-Komponenten
- Komplexe Logik → Custom Hooks (`use[Feature][Purpose].ts`)
- Kein `any` in TypeScript
- Konstanten in `const/`, keine hartcodierten Strings

### Query-Performance (innerhalb RPCs)

- **Kein N+1:** Nie Queries in Schleifen → `.in("id", ids)` + in-memory gruppieren
- **Kein O(n²):** Lookup-Tables statt verschachtelte Loops
- **Parallel:** Unabhängige Subqueries im selben RPC
- **Selektiv:** Nur benötigte Felder in JSONB aufnehmen

## Database

- **Migrations via CLI:** `supabase migration new <name>` — nie manuell Timestamps
- **Naming:** `YYYYMMDDHHmmss_[kategorie]_name.sql` — Kategorien: `table_`, `rls_`, `rpc_`, `fix_`
- **Header-Kommentar Pflicht** (Purpose, Changes, Dependencies)
- RLS Pflicht auf jeder Tabelle, separate Policies pro Operation/Rolle
- `(select auth.uid())` statt `auth.uid()` für Performance

## E2E Testing

> **Vollständige Architektur:** `CLAUDE-TEST.md` — Scaffold (Stores, Base Page, Playwright-Config, Smoke + Buyer-Skelett) implementiert.

Journey-basiert, `getOrCreate*()` Pattern aus `e2e/utils/ui-finders.ts`, Page Objects Pflicht (`e2e/page-objects/base.page.ts`), `data-testid` Selektoren, kein `waitForTimeout()`.
Commands: `npm run test:e2e`, `npm run test:e2e:ui`, `npm run test:e2e:report`.
Einmalig: `npx playwright install chromium`.

## Code-Konventionen

- **Sprache:** Kommentare, Fehlermeldungen, UI-Texte auf Deutsch
- **Path Alias:** `@/*` → `./src/*`
- **Verstehen vor Handeln:** Aufgabe analysieren bevor Code geschrieben wird
- **DRY-Recherche:** Feature-Ordner → Globale Types/Components → DB-Schema prüfen

## Erweiterte Dokumentation

- `docs/rules/DESIGN-SYSTEM.md` — **Design-System: Tokens, Komponenten, Regeln** (PFLICHT vor UI-Arbeit lesen)
- `docs/rules/STATE-MACHINES.md` — State Machine Regeln + Beispiele für alle Entities
- `docs/rules/STYLING.md` — Farben, Badges, Cookie-Consent, Design Tokens
- `docs/rules/SERVER-ACTIONS.md` — Action-Pattern, Fehlerbehandlung, Redirect
- `docs/rules/RPC-REFERENCE.md` — Supabase RPC-Funktionen
- `supabase/migrations/README.md` — Naming, Header-Template, geplante Migrationen
- `CLAUDE-TEST.md` — E2E Testing Architektur
