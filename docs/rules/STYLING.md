# Styling

> Ergänzt `DESIGN-SYSTEM.md` um Token-Details und spezielle Pattern.

## Token-Quelle

Alle Farb-, Radius- und Shadow-Tokens leben in `src/app/globals.css`:

```css
:root {
  --background: …;
  --foreground: …;
  --primary: …;
  --primary-foreground: …;
  --destructive: …;
  --border: …;
  --ring: …;
  --radius-md: 0.5rem;
  /* … */
}

.dark {
  --background: …;
  /* invertierte Dark-Mode-Werte */
}
```

Tailwind liest die Tokens via `theme(--background)`-Bridge aus (Tailwind 4). Neue Farben **niemals** direkt in Komponenten eintragen — immer erst Token hier definieren.

## StatusBadge-Töne

| Tone | Anwendung |
|------|-----------|
| `neutral` | Archivierte / inaktive Status (Grauzone) |
| `info` | Infoschild, Templates, Test-Environment |
| `success` | Aktiv, Saved, Green-Path |
| `warning` | Verfällt bald, braucht Aufmerksamkeit |
| `error` | Fehler, Rejected, Failed |
| `pending` | In Bearbeitung, Approval ausstehend |

Neue Status-Werte einer Entity → Mapping `SessionStatus → StatusTone` in der Komponente (siehe `sessions-table.tsx`) neben der State-Machine führen. Mapping NICHT in die State Machine selbst legen (die ist UI-unabhängig).

## Spacing / Layout

- Default-Gap in Listen/Stacks: `gap-4` (16px), in Gruppen `gap-2` (8px)
- Seitenpadding: `px-6 py-10` für Content-Seiten, `px-6 py-4` in Headers
- Max-Breite Content: `max-w-5xl` (Listen), `max-w-4xl` (Detailansichten), `max-w-sm` (Auth-Formulare)

## Dialog-Sizes

Entscheidung aus AGENTS.md §"AppDialog size-Prop":

| Use-Case | Size |
|----------|------|
| Confirm / Delete | `sm` |
| 1–3 Felder Create-Form | `md` |
| Standard-Form | `lg` |
| Form mit Sections | `xl` – `3xl` |
| Detailview mit KPIs | `4xl` |
| Tabellen im Dialog | `5xl` – `6xl` |
| Vergleichsansichten | `full` |

## Icons

- Quelle: `lucide-react`
- Nicht mit Emojis mischen; wenn Icon, dann Lucide
- Inline-Icons in Buttons: Icon links, Label rechts, Gap via `gap-1.5` (Button-Default)
- Icon-Only-Buttons brauchen `aria-label`

## Cookie-Consent / Tracking

Aktuell keine Analytics / kein Tracking. Falls später ergänzt:
- Banner-Layout: shadcn `alert` + `AppDialog size="sm"` fürs Detail-Panel
- Token: `bg-muted` Hintergrund, `text-foreground` Text
- E2E: `data-testid="cookie-consent"` auf Wrapper
