# Supabase Migrations

> Regeln aus `AGENTS.md`:
> - Migrations via CLI: `supabase migration new <name>` — nie manuell Timestamps
> - Naming: `YYYYMMDDHHmmss_[kategorie]_name.sql` — Kategorien: `table_`, `rls_`, `rpc_`, `fix_`
> - Header-Kommentar Pflicht (Purpose, Changes, Dependencies)
> - RLS Pflicht auf jeder Tabelle, separate Policies pro Operation/Rolle
> - `(select auth.uid())` statt `auth.uid()` für Performance

## Beispiel-Header

```sql
-- Purpose:      Legt die Kern-Tabellen sessions + scenarios an.
-- Changes:      CREATE TABLE sessions, scenarios; CHECK-Constraints für Status
-- Dependencies: Keine (erste Migration)
```

## Migrationen

### ✅ Implementiert

| Datei | Zweck |
|-------|-------|
| `20260421120000_table_profiles.sql` | profiles (Auth-Spiegel) + Trigger `handle_new_user`, `sync_email_verified` |
| `20260421120100_table_sessions.sql` | sessions + Status-CHECK (ACTIVE/ARCHIVED) + 4 RLS-Policies |
| `20260421120200_table_scenarios.sql` | scenarios + Status-CHECK (DRAFT/SAVED) + RLS delegiert an Session-Ownership |
| `20260421120300_rpc_get_sessions.sql` | `get_sessions`, `get_session_core`, `get_session_scenarios`, `get_session(id, include_scenarios)` |
| `20260421120400_rpc_mutate_sessions.sql` | `create_session`, `archive_session`, `restore_session` (SECURITY DEFINER, auth.uid()-Check) |
| `20260421120500_rpc_scenarios.sql` | `get_scenarios`, `create_scenario`, `save_scenario`, `delete_scenario` |

### ⏳ Geplant

- `table_universe_profiles.sql` — Bond-Universen (name, bonds JSONB, is_default)
- `table_presets.sql` — Constraint-Templates (key, value JSONB, is_default)
- `table_settings.sql` — Key-Value Store (key, value JSONB, user_id)
- `rpc_get_scenario.sql` — Detail-RPC mit optional `include_bonds`

## Status-CHECK-Constraints

Die State-Machine-Werte aus `src/features/*/const/state-machine.ts` **müssen exakt** mit DB-Constraints übereinstimmen:

```sql
ALTER TABLE sessions
  ADD CONSTRAINT sessions_status_check CHECK (status IN ('ACTIVE', 'ARCHIVED'));

ALTER TABLE scenarios
  ADD CONSTRAINT scenarios_status_check CHECK (status IN ('DRAFT', 'SAVED'));
```

## RLS-Pattern

```sql
-- SELECT
CREATE POLICY "Users read own sessions"
  ON sessions FOR SELECT
  USING ((select auth.uid()) = user_id);

-- INSERT
CREATE POLICY "Users create own sessions"
  ON sessions FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE / DELETE analog, je eine Policy pro Operation
```
