-- Purpose:      Legt sessions-Tabelle + RLS an. Session = Arbeitseinheit (Portfolio + Constraints + Scenario-Refs).
-- Changes:      CREATE TABLE sessions, CHECK-Constraint auf status (synchron zu src/features/sessions/const/state-machine.ts),
--               RLS-Policies separat pro Operation (AGENTS.md §"Database").
-- Dependencies: profiles-Tabelle (20260421120000).

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  universe_profile_id uuid,  -- FK wird in späterer Migration ergänzt
  data jsonb NOT NULL DEFAULT '{}'::jsonb,  -- Portfolio + Constraints (Aggregatwurzel-Payload)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sessions_status_check CHECK (status IN ('ACTIVE', 'ARCHIVED'))
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON public.sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_status_idx ON public.sessions (status);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_own"
  ON public.sessions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "sessions_insert_own"
  ON public.sessions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "sessions_update_own"
  ON public.sessions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "sessions_delete_own"
  ON public.sessions FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- updated_at automatisch nachziehen
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_touch_updated_at ON public.sessions;
CREATE TRIGGER sessions_touch_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
