# E2E Testing Architektur — SPEngine Next

> **Diese Datei ist die Referenz für alle E2E-Tests in `/srv/src/spengine-next/`.**
> **Vor dem Schreiben neuer Tests IMMER lesen.**
>
> **Hinweis zum Projektstand:** Das Scaffold (Stores, Base Page, Playwright-Config, Smoke-Spec) ist implementiert. Die domänenspezifischen Journeys (03 Sourcing/Offer, 04 Negotiation, …) sind als **Template** angelegt, aber inhaltlich leer, weil die SPEngine-Next-Entities (Sourcing, Offer, …) noch aus `/opt/spengine/` abzuleiten sind. Journey 00 (Smoke) läuft, Journey 01 (Buyer-Setup) ist als Skelett lauffähig.

## Konzept: Journey-basiertes E2E Testing

Tests sind als **Journeys** (End-to-End-Geschäftsprozesse) organisiert, die sequentiell in einer **Wasserfall-Kette** ausgeführt werden. Jede Journey baut auf dem Zustand der vorherigen auf.

**Kernprinzip:** Teure Setup-Schritte (User-Registrierung, Onboarding, Sourcing-Erstellung) werden **einmal** ausgeführt und über ein 3-Schichten-Persistenzmodell für nachfolgende Journeys wiederverwendet.

```
Journey 00: Smoke (Landing Page läuft)
Journey 01: Buyer-Setup
    ↓
Journey 02: Supplier-Setup
    ↓
Journey 03: Sourcing + Angebot           ← domänenspezifisch, TBD
    ├─→ Journey 04: Verhandlung          ← TBD
    │       └─→ Journey 05: Bestellung   ← TBD
    ├─→ Journey 06: Genehmigungsworkflow ← TBD
    └─→ Journey 07: Authorization + Subscription ← TBD
```

## Verzeichnisstruktur (implementiert)

```
e2e/
├── .auth/                          # Persistierte Auth-Dateien & Zustand (gitignored)
│   ├── journey-state.json          # JourneyStore (Key-Value)
│   ├── test-users.json             # TestUserStore
│   ├── test-entities.json          # EntityStore
│   └── [email-slug].json           # Playwright storage-state pro User
├── infrastructure/
│   ├── journey-store.ts            # ✅ Cross-Journey Key-Value Store
│   ├── test-user-store.ts          # ✅ User-Persistenz
│   ├── entity-store.ts             # ✅ Entity-Persistenz
│   ├── auth-manager.ts             # 🟡 Skelett — `ensureUser` wirft bis Signup-Page steht
│   └── journey-helpers.ts          # ✅ markEmailVerified, deleteAuthUser (benötigt Supabase)
├── page-objects/
│   ├── base.page.ts                # ✅ Basisklasse (abstract goto + expectPageLoaded)
│   └── login.page.ts               # 🟡 Skelett — Selektoren warten auf /login-Seite
├── utils/
│   ├── db-helpers.ts               # ✅ getSupabaseAdmin() (Service-Role-Key)
│   ├── ui-finders.ts               # ✅ getOrCreate* (Store-only, bis UI-Flow steht)
│   ├── ui-setup.ts                 # 🟡 create* Skelette (werfen bis Domäne steht)
│   ├── db-setup-recipes.ts         # 🟡 ensureApprovalPolicy, ensureActiveSubscription
│   └── test-data-factory.ts        # ✅ Emails, Passwörter, Company-Namen
├── specs/journeys/
│   ├── 00-smoke.spec.ts            # ✅ lauffähig
│   ├── 01-buyer-setup.spec.ts      # ✅ Template-Journey — verdrahtet Stores
│   └── 02..07-*.spec.ts            # ⏳ TBD — sobald Domäne steht
└── archive/                        # Alte/gelöschte Specs (Referenz, nicht ausgeführt)
```

Legende: ✅ implementiert · 🟡 Skelett mit TODOs · ⏳ ausstehend

## Erste Schritte

```bash
# 1. Env-Vars setzen (Supabase + Service-Role-Key)
cp .env.local.example .env.local
# ... Werte eintragen

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
  Deshalb auf langsamen Tests `test.slow()` (siehe `00-smoke.spec.ts`).
- **prod** (`PLAYWRIGHT_USE_PROD_BUILD=1`): kompletter `next build` vor dem Start,
  dann alle Routes sofort bedienbar. Build dauert initial 1–3 min, danach <1s
  pro Request. Für CI und Journey-Runs empfohlen. Läuft auf Port 3001, damit
  parallel zum Dev-Server (3000) kein Konflikt entsteht.

## 3-Schichten-Persistenzmodell

### Schicht 1: JourneyStore (`journey-store.ts`)

Einfacher Key-Value Store für IDs und Referenzen zwischen Journeys.

```typescript
import { journeyGet, journeyHas, journeySet, journeyReset } from "../infrastructure/journey-store";

// In Journey 03: Sourcing-ID speichern
journeySet("sourcing-id", sourcing.id);

// In Journey 04: Sourcing-ID laden (wirft wenn nicht vorhanden)
const sourcingId = journeyGet<string>("sourcing-id");

// Defensiv prüfen
if (journeyHas("offer-id")) { ... }
```

**Speicherort:** `e2e/.auth/journey-state.json`

### Schicht 2: TestUserStore (`test-user-store.ts`)

Persistiert erstellte Test-User (Email, Passwort, Org-ID, Rolle, Auth-State-Pfad).

```typescript
import {
  getStoredTestUser,
  storeTestUser,
  authStatePathFor,
} from "../infrastructure/test-user-store";

// Prüfen ob User existiert
const existing = getStoredTestUser("e2e-buyer@test.local");
if (existing) return existing;

// Anlegen
storeTestUser({
  email: "e2e-buyer@test.local",
  password: "Test1234!E2E",
  role: "buyer",
  orgId: "...",
  authStatePath: authStatePathFor("e2e-buyer@test.local"),
});
```

**Speicherort:** `e2e/.auth/test-users.json`

### Schicht 3: EntityStore (`entity-store.ts`)

Persistiert Business-Entities mit Typ + ID + Metadata.

```typescript
import { getStoredTestEntity, storeTestEntity } from "../infrastructure/entity-store";

storeTestEntity({ type: "sourcing", id: "abc-123", metadata: { lineCount: 3 } });
const existing = getStoredTestEntity("sourcing", "abc-123");
```

**Speicherort:** `e2e/.auth/test-entities.json`

## Kern-Pattern: `getOrCreate*()` — Wiederverwendung statt Neuerstellung

**Das wichtigste Pattern im gesamten Test-Setup.** Alle Entities werden über `getOrCreate*()` aus `e2e/utils/ui-finders.ts` bezogen.

### Singleton-Pattern (Buyer, Approver, Admin)

```typescript
import { getOrCreateBuyer, BUYER_EMAIL } from "../../utils/ui-finders";

const buyer = await getOrCreateBuyer(browser);
// Liefert gecachten User oder erstellt ihn (sobald ensureUser implementiert ist).
```

### Indexed-Pattern (Supplier)

```typescript
import { getOrCreateSupplier, getOrCreateSuppliers } from "../../utils/ui-finders";

const supplier0 = await getOrCreateSupplier(browser, 0); // e2e-supplier-0@test.local
const suppliers = await getOrCreateSuppliers(browser, 3); // 0, 1, 2
```

### Verkettetes Pattern (Entity mit Abhängigkeiten)

Für zusammengesetzte Entities (Sourcing + Offer):

```typescript
import { getOrCreateJourneyEntity } from "../../utils/ui-finders";

const sourcing = await getOrCreateJourneyEntity("sourcing", async () => {
  const buyer = await getOrCreateBuyer(browser);
  const supplier = await getOrCreateSupplier(browser, 0);
  // ... UI-Flow (sobald Domäne steht)
  return { sourcingId: "...", offerId: "..." };
});
```

## UI-Setup-Funktionen (`ui-setup.ts`) — Template

Jede Funktion führt einen kompletten UI-Flow aus und gibt Entity-IDs zurück. **Aktuell alles Skelett, wirft bei Aufruf.**

| Funktion | Erzeugt | Schritte |
|----------|---------|----------|
| `createBuyer()` | Buyer-Account + Org | Registrierung → E-Mail-Verifikation → Onboarding → Login |
| `createSupplier(index)` | Supplier-Account + Org | Registrierung → E-Mail-Verifikation → Onboarding → Login |
| `createSourcing()` | Ausschreibung | Case → Sourcing + Positionen → Supplier einladen → Veröffentlichen |
| `submitOffer()` | Angebot | Supplier-Login → Angebot öffnen → Preise → Einreichen |
| `createNegotiationRound()` | Verhandlungsrunde | Runde erstellen → Aktivieren |
| `createOrder()` | Bestellung | Vergabe → Bestellung anlegen |
| `createApprover()` | Genehmiger-Account | Registrierung → Buyer-Org beitreten → Approver-Rolle zuweisen |

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
- **Domänen-Methoden** (`fillOffer()`, `selectSupplier()`) kapseln Interaktionen

## Neue Journey erstellen — Schritt-für-Schritt

### 1. Spec-Datei anlegen

```typescript
// e2e/specs/journeys/08-neue-feature.spec.ts
import { expect, test } from "@playwright/test";

import { journeyGet, journeySet } from "../../infrastructure/journey-store";
import { getOrCreateBuyer, getOrCreateSupplier } from "../../utils/ui-finders";
import { LoginPage } from "../../page-objects/login.page";

test.describe.serial("Journey: Neues Feature", () => {
  test("Setup: Buyer laden", async ({ browser }) => {
    const buyer = await getOrCreateBuyer(browser);
    expect(buyer.email).toBeTruthy();
  });

  test("Feature-Test", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // ...
  });
});
```

### 2. Playwright-Config ergänzen

```typescript
// playwright.config.ts → projects Array
{
  name: "journey-neue-feature",
  testMatch: /08-neue-feature\.spec\.ts/,
  dependencies: ["journey-buyer-setup"],
  use: { ...devices["Desktop Chrome"] },
},
```

### 3. Bestehende Entities wiederverwenden — NIEMALS neu erstellen

```typescript
// ❌ FALSCH — Buyer in jedem Test neu erstellen
const buyer = await createBuyer(browser);

// ✅ RICHTIG — Existierenden Buyer wiederverwenden
const buyer = await getOrCreateBuyer(browser);

// ❌ FALSCH — Supplier hardcoded erstellen
const supplier = await createSupplier(browser, { email: "test@test.com" });

// ✅ RICHTIG — Indexed Supplier verwenden
const supplier = await getOrCreateSupplier(browser, 0);
```

## DB-Helpers für Tests

Direkter DB-Zugriff über Service Role Key (umgeht RLS):

```typescript
import { getSupabaseAdmin } from "../../utils/db-helpers";

const db = getSupabaseAdmin();

// Daten direkt einfügen (z.B. Approval Policy, Subscription)
await db.from("approval_policies").insert({ ... });

// Testdaten verifizieren
const { data } = await db.from("sourcings").select("status").eq("id", sourcingId).single();
expect(data?.status).toBe("AWARDED");
```

**Wann DB-Helpers statt UI:**
- Setup-Daten die nicht über UI testbar sind (Policies, Subscriptions)
- E-Mail-Verifikation (kein echtes E-Mail-System im Test) → `markEmailVerified()`
- Verifizierung von DB-Zustand nach UI-Aktionen
- **NICHT** für Aktionen die über die UI getestet werden sollen

## Auth-Handling

### Feste Test-Credentials (siehe `test-data-factory.ts`)

| User | Email | Passwort | Typ |
|------|-------|----------|-----|
| Buyer | `e2e-buyer@test.local` | `Test1234!E2E` | Singleton |
| Approver | `e2e-approver@test.local` | `Test1234!E2E` | Singleton |
| Admin | `e2e-admin@test.local` | `Test1234!E2E` | Singleton |
| Supplier N | `e2e-supplier-{N}@test.local` | `Test1234!E2E` | Indexed |

### Auth-State-Pfade

```typescript
// Automatisch aus Email abgeleitet via `authStatePathFor()`:
"e2e-buyer@test.local" → "e2e/.auth/e2e-buyer-test-local.json"
```

## Playwright-Konfiguration (`playwright.config.ts`)

- **`workers: 1`** — Seriell, keine Parallelisierung (Journeys hängen zusammen)
- **`fullyParallel: false`** — Tests innerhalb einer Journey sind sequentiell
- **`retries: 2`** in CI, `0` lokal
- **Dependencies** zwischen Projects steuern die Ausführungsreihenfolge
- **`webServer`** startet `npm run dev` automatisch (reuse lokal, frischer Start in CI)
- **`baseURL`** via `PLAYWRIGHT_BASE_URL` überschreibbar

## Regeln

1. **`getOrCreate*()` IMMER verwenden** — nie direkt `create*()` aufrufen außer im getOrCreate selbst
2. **Page Objects Pflicht** — kein `page.locator()` in Spec-Dateien
3. **`data-testid` Pflicht** — jedes interaktive Element braucht ein data-testid (auch im AGENTS.md gefordert)
4. **Kein `waitForTimeout()`** — Playwright Auto-Waiting nutzen (Ausnahme: externe Dienste)
5. **DB-Helpers nur für Setup/Verify** — nie für Aktionen die über UI getestet werden sollen
6. **Neue Entities in JourneyStore speichern** — damit nachfolgende Journeys sie wiederverwenden
7. **Feste Emails verwenden** — aus `test-data-factory.ts` (`SINGLETON_EMAILS`, `supplierEmail(i)`)
8. **Keine Stripe-UI-Tests** — Checkout-Flows via DB simulieren (Stripe DOM ändert sich häufig)

## Die 7 Journeys (Template, domänenspezifisch TBD)

Sobald die SPEngine-Next-Entities (Case, Sourcing, Offer, Order, Approval, Subscription) in `AGENTS.md` definiert und in Supabase modelliert sind, werden diese Journeys konkret implementiert. Die Struktur bleibt 1:1 wie in der Vorlage:

### Journey 01: Buyer-Setup
**Erzeugt:** Buyer-Account, Buyer-Organisation (ACTIVE)
**Speichert:** `buyer-email`, `buyer-password`, `buyer-company`, `buyer-auth`, `buyer-orgId`

### Journey 02: Supplier-Setup
**Abhängig von:** 01
**Erzeugt:** Supplier-Account, Supplier-Organisation (ACTIVE)
**Speichert:** `supplier-email`, `supplier-password`, `supplier-company`, `supplier-auth`

### Journey 03: Sourcing + Angebot
**Abhängig von:** 01, 02
**Erzeugt:** Case, Sourcing (3 Positionen, 1 Supplier), Angebot (eingereicht)
**Speichert:** `sourcing-id`, `case-id`, `offer-id`

### Journey 04: Verhandlung
**Abhängig von:** 03
**Erzeugt:** Verhandlungsrunde (FREETEXT), aktualisierte Angebote
**Testet:** Runde erstellen, Supplier antwortet, Preisspiegel-Vergleich

### Journey 05: Bestellung
**Abhängig von:** 04
**Erzeugt:** Bestellung aus Vergabeentscheidung
**Testet:** Order-Erstellung über UI, Bestellung in Liste sichtbar

### Journey 06: Genehmigungsworkflow
**Abhängig von:** 03
**Erzeugt:** 3 Supplier, eigenes Sourcing, Approval Policy, Approver-Account
**Testet:** Vergabeentscheidung → IN_APPROVAL → Approver genehmigt → AWARDED

### Journey 07: Authorization + Subscription
**Abhängig von:** 01
**Erzeugt:** Stripe-Subscription (via DB-Simulation)
**Testet:** Starter-Plan sichtbar, Redirect zu Stripe, Professional-Plan nach Upgrade, RPC-Checks

## Nächste konkrete Schritte

1. `/login`- und `/signup`-Seiten in Next.js 16 bauen (Supabase Auth via `@supabase/ssr`), `data-testid` setzen.
2. `LoginPage`-Page-Object + `ensureUser` in `auth-manager.ts` implementieren.
3. Supabase-Schema für SPEngine-Next-Entities anlegen (Case, Sourcing, Offer, …).
4. Journey 01 + 02 von Skelett zu vollständigem UI-Flow ausbauen.
5. `journey-*` Projects in `playwright.config.ts` einkommentieren und Dependencies setzen.
