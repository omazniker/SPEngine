-- Purpose:      Legt scenarios-Tabelle + RLS an. Scenario = benannte Portfolio-Variante innerhalb einer Session.
-- Changes:      CREATE TABLE scenarios, CHECK-Constraint auf status synchron zu State Machine,
--               FK auf sessions mit CASCADE-Delete, RLS delegiert an Session-Ownership.
-- Dependencies: sessions-Tabelle (20260421120100).

CREATE TABLE IF NOT EXISTS public.scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,   -- Optimizer-Constraints
  result jsonb NOT NULL DEFAULT '[]'::jsonb,   -- Ausgewählte Bonds + Gewichte
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,    -- KPI-Stats (Yield, Duration, Rating, ESG)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scenarios_status_check CHECK (status IN ('DRAFT', 'SAVED'))
);

CREATE INDEX IF NOT EXISTS scenarios_session_id_idx ON public.scenarios (session_id);
CREATE INDEX IF NOT EXISTS scenarios_status_idx ON public.scenarios (status);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

-- RLS: Zugriff nur wenn die Session dem User gehört (Ownership-Delegation).
CREATE POLICY "scenarios_select_own"
  ON public.scenarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = scenarios.session_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "scenarios_insert_own"
  ON public.scenarios FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = scenarios.session_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "scenarios_update_own"
  ON public.scenarios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = scenarios.session_id
        AND s.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = scenarios.session_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "scenarios_delete_own"
  ON public.scenarios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = scenarios.session_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

DROP TRIGGER IF EXISTS scenarios_touch_updated_at ON public.scenarios;
CREATE TRIGGER scenarios_touch_updated_at
  BEFORE UPDATE ON public.scenarios
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
