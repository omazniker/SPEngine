# Design System

> Pflicht vor jeder UI-Arbeit lesen (AGENTS.md §"UI Patterns").

## Farben, Radien, Shadows — NUR über Tokens

Alle visuellen Werte kommen aus CSS-Variablen in `src/app/globals.css` (shadcn-Token-Schema). **Keine hardcoded Hex-Werte, keine Inline-Farben, keine Tailwind `text-[#…]`-Literale.**

| Verwendung | Token-Klasse |
|------------|--------------|
| Primäraktion | `bg-primary text-primary-foreground` |
| Sekundär | `bg-secondary text-secondary-foreground` |
| Container-Background | `bg-background`, `bg-card`, `bg-popover` |
| Rahmen | `border-border`, `border-input` |
| Muted-Text | `text-muted-foreground` |
| Destruktiv | `bg-destructive/10 text-destructive` |
| Ring / Focus | `ring-ring`, `focus-visible:ring-ring` |

Dark-Mode ist automatisch: Tokens sind in `:root` und `.dark` gespiegelt, ThemeProvider schaltet die Klasse um.

## Komponenten-Inventar (implementiert)

| Komponente | Pfad | Wann nutzen |
|------------|------|-------------|
| Button | `@/components/ui/button` | Alle Aktionen. Varianten: default, outline, secondary, ghost, destructive, link. Für `<Link>` / `<a>`: `render={…}` + `nativeButton={false}`. |
| Input | `@/components/ui/input` | Alle Text/Number/Email-Eingaben |
| Label | `@/components/ui/label` | Jedes Input-Feld braucht ein Label (Accessibility) |
| Badge | `@/components/ui/badge` | Statische Labels (Counts, Tags) |
| StatusBadge | `@/components/ui/status-badge` | **Status-Darstellung** — IMMER dieses nehmen, niemals Badge direkt färben |
| Table | `@/components/ui/table` | Low-level primitive — nicht direkt verwenden; stattdessen DataTable |
| DataTable | `@/components/table/data-table` | **Alle Listen** — Pflicht, nicht Table direkt |
| AppDialog | `@/components/ui/app-dialog` | **Alle Dialoge** — NIE den shadcn Dialog direkt |
| GenericForm | `@/components/form/generic-form` | **Alle Mutationen** — Pflicht-Wrapper |
| Skeleton | `@/components/ui/skeleton` | Loading-Zustände mit Shimmer |
| Toaster / toast | `sonner` | Feedback nach Aktionen; `data-testid="toast"` ist in Providers gesetzt |

## Wann welche Komponente

- **Status anzeigen** → `StatusBadge tone={…}` (nie `Badge variant="…"` plus Farben)
- **Liste darstellen** → `DataTable` mit `columns` + `rows` + `testIdPrefix` (nie `<table>` direkt)
- **Dialog öffnen** → `AppDialog` mit `size`-Prop (nie `Dialog`/`DialogContent` direkt)
- **Formular absenden** → `GenericForm` + `GenericFormSubmit` (nie `<form onSubmit>` + manueller fetch)
- **Leerer State** → `emptyState`-Slot von DataTable mit ruhigem Text + ggf. CTA-Button

## data-testid Konvention

Alle interaktiven / state-tragenden Elemente brauchen ein `data-testid`. Schema:

- Button: `[feature]-[action]-button` — z.B. `sessions-create-button`
- Form: `[feature]-[action]-form`, Felder `[feature]-[action]-[field]-input`
- Table: `[feature]-table`, Rows `[feature]-row-[id]`, Empty `[feature]-empty`
- Dialog: `[feature]-[action]-dialog`
- Page: `[route]-page` (z.B. `sessions-page`, `login-page`)

## Typografie

- Headings: `text-2xl font-semibold` (H1), `text-lg font-semibold` (H2)
- Body: `text-sm` (Standard), `text-base` (Mobile-heavy)
- Muted: `text-muted-foreground` statt manueller Grautöne
- Tabular-Numbers: `tabular-nums` auf Zahlenspalten
- Icons: `lucide-react`, size über Tailwind `size-4` etc. (Button setzt size automatisch)
