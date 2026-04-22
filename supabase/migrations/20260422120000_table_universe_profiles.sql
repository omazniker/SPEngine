-- Purpose:      Legt universe_profiles-Tabelle + RLS an. UniverseProfile = immutable Bond-Snapshot.
-- Changes:      CREATE TABLE universe_profiles (bonds JSONB), RLS-Policies pro Operation (AGENTS.md §"Database").
--               Keine UPDATE-Policy — UniverseProfiles sind per Design unveränderlich (Aggregatwurzel-Snapshot).
-- Dependencies: profiles-Tabelle (20260421120000).

CREATE TABLE IF NOT EXISTS public.universe_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name text NOT NULL,
  bonds jsonb NOT NULL DEFAULT '[]'::jsonb,
  bond_count integer NOT NULL DEFAULT 0,
  source_file text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS universe_profiles_user_id_idx ON public.universe_profiles (user_id);

ALTER TABLE public.universe_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "universe_profiles_select_own"
  ON public.universe_profiles FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "universe_profiles_insert_own"
  ON public.universe_profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Kein UPDATE — UniverseProfiles sind immutable. Änderungen = neuer Snapshot.

CREATE POLICY "universe_profiles_delete_own"
  ON public.universe_profiles FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- FK von sessions.universe_profile_id nachziehen (Spalte existiert seit der
-- sessions-Migration, aber ohne FK-Constraint weil die referenzierte Tabelle
-- erst jetzt entsteht).
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_universe_profile_id_fkey
  FOREIGN KEY (universe_profile_id) REFERENCES public.universe_profiles (id) ON DELETE SET NULL;
