# E2E Testing Architektur — SPEngine Next

> **Diese Datei ist die Referenz für alle E2E-Tests in `/srv/src/spengine-next/`.**
> **Vor dem Schreiben neuer Tests IMMER lesen.**
>
> **Projektstand:** Smoke-Journey (00) und User-Setup (01) laufen gegen lokales Supabase.
> Weitere Journeys bauen auf SPEngine-Entities (Session, Scenario, UniverseProfile, Preset) auf
> und werden ergänzt, sobald die jeweiligen UI-Flows stehen.

## Konzept: Journey-basiertes E2E Testing

Tests sind als **Journeys** (End-to-End-Abläufe) organisiert, die sequentiell in einer **Wasserfall-Kette** ausgeführt werden. Jede Journey baut auf dem Zustand der vorherigen auf.

**Kernprinzip:** Teure Setup-Schritte (Signup, Universe-Upload, Session-Erstellung) werden **einmal** ausgeführt und über ein 3-Schichten-Persistenzmodell für nachfolgende Journeys wiederverwendet.

```
Journey 00: Smoke (statische Routes + Empty-States)
    ↓
Journey 01: User-Setup (Signup → Verifikation → Login → Storage-State)
    ↓
Journey 02: Session-Lifecycle        ← TBD, SPEngine-spezifisch
    ↓
Journey 03: Scenario-Optimierung     ← TBD
    ↓
Journey 04: Universe-Upload          ← TBD
```

SPEngine ist **Single-User**. Es gibt keine Mandantenstruktur, keine Rollen, keine Approval-Flows. Pro Test-Session genügt ein Primärnutzer; ein Sekundärnutzer existiert nur für RLS-Isolationstests.

## Verzeichnisstruktur

```
e2e/
├── .auth/                          # Persistierte Auth-Dateien & Zustand (gitignored)
│   ├── journey-state.json          # JourneyStore (Key-Value)
│   ├── test-users.json             # TestUserStore
│   ├── test-entities.json          # EntityStore
│   └── [email-slug].json           # Playwright storage-state pro User
├── infrastructure/
│   ├── journey-store.ts            # Cross-Journey Key-Value Store
│   ├── test-user-store.ts          # User-Persistenz (Email, Password, profileId, authStatePath)
│   ├── entity-store.ts             # Entity-Persistenz (type/id/metadata)
│   ├── auth-manager.ts             # ensureUser (Signup + markEmailVerified + Login + storageState)
│   └── journey-helpers.ts          # markEmailVerified, deleteAuthUser (benötigt Supabase)
├── page-objects/
│   ├── base.page.ts                # Basisklasse (abstract goto + expectPageLoaded)
│   ├── login.page.ts               # /login
│   └── signup.page.ts              # /signup
├── utils/
│   ├── db-helpers.ts               # getSupabaseAdmin() (Service-Role-Key)
│   ├── ui-finders.ts               # getOrCreatePrimaryUser / getOrCreateSecondaryUser
│   └── test-data-factory.ts        # DEFAULT_PASSWORD, PRIMARY_EMAIL, SECONDARY_EMAIL, uniqueRunId
├── specs/journeys/
│   ├── 00-smoke.spec.ts            # statische Routes, Empty-States, 404
│   └── 01-user-setup.spec.ts       # UI-Signup + Storage-State-Persistenz
└── archive/                        # Alte/gelöschte Specs (Referenz, nicht ausgeführt)
```

## Erste Schritte

```bash
# 1. Env-Vars setzen (Supabase + Service-Role-Key)
cp .env.local.example .env.local
# ... Werte eintragen (lokale Supabase: supabase start)

# 2. Chromium-Binary installieren (einmalig, ~170 MB)
npx playwright install chromium

# 3. Tests laufen lassen
npm run test:e2e            # dev-Mode (next dev, Port 3000) — schnelles Feedback
npm run test:e2e -- --project=smoke
npm run test:e2e:prod       # Prod-Build (next build + next start -p 3001) — stabil, CI-tauglich
npm run test:e2e:ui         # UI-Mode
npm run test:e2e:report     # letzten HTML-Report anzeigen
```

### Dev- vs. Prod-Lane

- **dev** (Default): Turbopack-On-Demand-Compilation. Erste Request an eine
  neue Route kann mehrere Minuten dauern, besonders dynamische Routes (`[id]`).
  Zusätzlich kann der Chrome-Renderer bei vielen aufeinanderfolgenden Compile-Hits
  OOMen. Für zuverlässige Läufe Prod-Lane nutzen.
- **prod** (`PLAYWRIGHT_USE_PROD_BUILD=1`): kompletter `next build` vor dem Start,
  dann alle Routes sofort bedienbar. Build dauert initial 1–3 min, danach <1s
  pro Request. Für CI und Journey-Runs empfohlen. Läuft auf Port 3001, damit
  parallel zum Dev-Server (3000) kein Konflikt entsteht.

## 3-Schichten-Persistenzmodell

### Schicht 1: JourneyStore (`journey-store.ts`)

Einfacher Key-Value Store für IDs und Referenzen zwischen Journeys.

```typescript
import { journeyGet, journeyHas, journeySet, journeyReset } from "../infrastructure/journey-store";

// In Journey 01: User-Daten speichern
journeySet("user-email", user.email);
journeySet("user-auth", user.authStatePath);

// In Journey 02: Wiederverwenden
const userEmail = journeyGet<string>("user-email");

// Defensiv prüfen
if (journeyHas("session-id")) { ... }
```

**Speicherort:** `e2e/.auth/journey-state.json`

### Schicht 2: TestUserStore (`test-user-store.ts`)

Persistiert erstellte Test-User (Email, Passwort, Supabase-profileId, Auth-State-Pfad).

```typescript
import {
  getStoredTestUser,
  storeTestUser,
  authStatePathFor,
} from "../infrastructure/test-user-store";

const existing = getStoredTestUser("e2e-primary@test.local");
if (existing?.authStatePath) return existing;

storeTestUser({
  email: "e2e-primary@test.local",
  password: "Test1234!E2E",
  profileId: "...",
  authStatePath: authStatePathFor("e2e-primary@test.local"),
});
```

**Speicherort:** `e2e/.auth/test-users.json`

### Schicht 3: EntityStore (`entity-store.ts`)

Persistiert Business-Entities mit Typ + ID + Metadata. Primäre Typen für SPEngine: `session`, `scenario`, `universe-profile`, `preset`.

```typescript
import { getStoredTestEntity, storeTestEntity } from "../infrastructure/entity-store";

storeTestEntity({ type: "session", id: "abc-123", metadata: { name: "Test Session" } });
const existing = getStoredTestEntity("session", "abc-123");
```

**Speicherort:** `e2e/.auth/test-entities.json`

## Kern-Pattern: `getOrCreate*()` — Wiederverwendung statt Neuerstellung

Alle Entities werden über `getOrCreate*()` aus `e2e/utils/ui-finders.ts` bezogen.

### User-Pattern

```typescript
import { getOrCreatePrimaryUser } from "../../utils/ui-finders";

const user = await getOrCreatePrimaryUser(browser);
// Liefert gecachten User oder erstellt ihn (UI-Signup + Login + Storage-State).
```

Für RLS-Isolationstests:

```typescript
import { getOrCreateSecondaryUser } from "../../utils/ui-finders";

const other = await getOrCreateSecondaryUser(browser);
// Zweiter, unabhängiger Nutzer — darf die Sessions von Primary nicht sehen.
```

### Entity-Pattern

Für zusammengesetzte Entities (Session mit Scenarios, Universe mit Bonds):

```typescript
import { getOrCreateJourneyEntity } from "../../utils/ui-finders";

const session = await getOrCreateJourneyEntity("primary-session", async () => {
  const user = await getOrCreatePrimaryUser(browser);
  // ... UI-Flow: /sessions → "Neue Session" → speichern
  return { sessionId: "...", scenarioIds: [...] };
});
```

## Page Objects

Alle Page Objects erben von `BasePage` und nutzen `data-testid` Selektoren:

```typescript
// e2e/page-objects/base.page.ts
abstract class BasePage {
  protected readonly page: Page;
  protected abstract readonly path: string;

  async goto(): Promise<void>;
  abstract expectPageLoaded(): Promise<void>;
  getByTestId(testId: string): Locator;
  async expectToast(message: string | RegExp): Promise<void>;
}
```

**Regeln:**
- **Kein `page.locator()` in Spec-Dateien** — immer Page Object Methoden nutzen
- **Selektoren:** `data-testid` bevorzugt, `getByRole()` als Alternative
- **Jedes Page Object** implementiert `expectPageLoaded()` zur Verifikation
- **Domänen-Methoden** (`saveScenario()`, `selectUniverse()`) kapseln Interaktionen

## Neue Journey erstellen — Schritt-für-Schritt

### 1. Spec-Datei anlegen

```typescript
// e2e/specs/journeys/02-session-lifecycle.spec.ts
import { expect, test } from "@playwright/test";

import { journeyGet, journeySet } from "../../infrastructure/journey-store";
import { getOrCreatePrimaryUser } from "../../utils/ui-finders";

test.describe.serial("Journey: Session-Lifecycle", () => {
  test("Setup: Primärnutzer laden", async ({ browser }) => {
    const user = await getOrCreatePrimaryUser(browser);
    expect(user.email).toBeTruthy();
  });

  test("Session anlegen + archivieren", async ({ browser }) => {
    const user = await getOrCreatePrimaryUser(browser);
    const context = await browser.newContext({ storageState: user.authStatePath });
    const page = await context.newPage();
    // ... UI-Flow
  });
});
```

### 2. Playwright-Config ergänzen

```typescript
// playwright.config.ts → projects Array
{
  name: "journey-session-lifecycle",
  testMatch: /02-session-lifecycle\.spec\.ts/,
  dependencies: ["journey-user-setup"],
  use: { ...devices["Desktop Chrome"] },
},
```

### 3. Bestehende Entities wiederverwenden — NIEMALS neu erstellen

```typescript
// ❌ FALSCH — User in jedem Test neu erstellen
const user = await createPrimaryUser(browser);

// ✅ RICHTIG — Bestehenden User wiederverwenden
const user = await getOrCreatePrimaryUser(browser);
```

## DB-Helpers für Tests

Direkter DB-Zugriff über Service Role Key (umgeht RLS):

```typescript
import { getSupabaseAdmin } from "../../utils/db-helpers";

const db = getSupabaseAdmin();

// Testdaten verifizieren
const { data } = await db.from("sessions").select("status").eq("id", sessionId).single();
expect(data?.status).toBe("ARCHIVED");
```

**Wann DB-Helpers statt UI:**
- E-Mail-Verifikation (kein echtes E-Mail-System im Test) → `markEmailVerified()`
- Verifizierung von DB-Zustand nach UI-Aktionen
- Setup-Daten die nicht über UI exponiert sind (z.B. Bulk-Seeding)
- **NICHT** für Aktionen die über die UI getestet werden sollen

## Auth-Handling

### Feste Test-Credentials (siehe `test-data-factory.ts`)

| User | Email | Passwort | Typ |
|------|-------|----------|-----|
| Primary | `e2e-primary@test.local` | `Test1234!E2E` | Singleton |
| Secondary | `e2e-secondary@test.local` | `Test1234!E2E` | Singleton (nur RLS-Tests) |

### Auth-State-Pfade

```typescript
// Automatisch aus Email abgeleitet via `authStatePathFor()`:
"e2e-primary@test.local" → "e2e/.auth/e2e-primary-test-local.json"
```

## Playwright-Konfiguration (`playwright.config.ts`)

- **`workers: 1`** — Seriell, keine Parallelisierung (Journeys hängen zusammen)
- **`fullyParallel: false`** — Tests innerhalb einer Journey sind sequentiell
- **`retries: 2`** in CI, `0` lokal
- **Dependencies** zwischen Projects steuern die Ausführungsreihenfolge
- **`webServer`** startet `npm run dev` automatisch (reuse lokal, frischer Start in CI)
- **`baseURL`** via `PLAYWRIGHT_BASE_URL` überschreibbar (im Prod-Modus gepinnt auf Port 3001)

## Regeln

1. **`getOrCreate*()` IMMER verwenden** — nie direkt inline signup/login aufrufen
2. **Page Objects Pflicht** — kein `page.locator()` in Spec-Dateien
3. **`data-testid` Pflicht** — jedes interaktive Element braucht ein data-testid (auch im AGENTS.md gefordert)
4. **Kein `waitForTimeout()`** — Playwright Auto-Waiting nutzen (Ausnahme: externe Dienste)
5. **DB-Helpers nur für Setup/Verify** — nie für Aktionen die über UI getestet werden sollen
6. **Neue Entities in JourneyStore / EntityStore speichern** — damit nachfolgende Journeys sie wiederverwenden
7. **Feste Emails verwenden** — aus `test-data-factory.ts` (`PRIMARY_EMAIL`, `SECONDARY_EMAIL`)
8. **Keine fiktiven Rollen** — SPEngine ist Single-User. Wenn ein Test Mandantentrennung prüft, Sekundärnutzer nutzen, nicht eine Pseudo-Rolle erfinden.

## Nächste konkrete Schritte

1. Session-Lifecycle (Anlegen, Aktiv, Archivieren) als Journey 02 verdrahten — baut auf Journey 01 auf.
2. Scenario-Lifecycle (Draft → Saved) als Journey 03, abhängig von 02.
3. Universe-Upload (XLSX → UniverseProfile aktiv) als Journey 04 — ggf. parallel zu 02, ohne Abhängigkeit.
4. RLS-Isolationstest: `getOrCreateSecondaryUser` muss die Sessions von Primary nicht sehen können.
