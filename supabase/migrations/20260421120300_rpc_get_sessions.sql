-- Purpose:      Atomare + komponierte RPCs für das sessions-Feature (AGENTS.md §"Modulare Datenschicht").
-- Changes:      get_sessions (Liste mit Scenario-Counts), get_session (Detail + optional include_scenarios).
-- Dependencies: sessions, scenarios (20260421120100, 20260421120200).

-- Atomare RPCs

-- Liefert die Liste aller Sessions des eingeloggten Users mit Basis-Feldern + Scenario-Count.
-- Kein include_scenarios — für Details `get_session(id, true)` nutzen.
CREATE OR REPLACE FUNCTION public.get_sessions()
RETURNS TABLE (
  id uuid,
  name text,
  status text,
  scenario_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.name,
    s.status,
    COALESCE(c.scenario_count, 0) AS scenario_count,
    s.created_at,
    s.updated_at
  FROM public.sessions s
  LEFT JOIN (
    SELECT session_id, COUNT(*) AS scenario_count
    FROM public.scenarios
    GROUP BY session_id
  ) c ON c.session_id = s.id
  WHERE s.user_id = (SELECT auth.uid())
  ORDER BY s.updated_at DESC;
$$;

-- Atomare Module für get_session
CREATE OR REPLACE FUNCTION public.get_session_core(p_session_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT to_jsonb(s)
  FROM public.sessions s
  WHERE s.id = p_session_id
    AND s.user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_session_scenarios(p_session_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at), '[]'::jsonb)
  FROM public.scenarios x
  WHERE x.session_id = p_session_id;
$$;

-- Komponierter Wrapper (Ebene 2 aus AGENTS.md)
CREATE OR REPLACE FUNCTION public.get_session(
  p_session_id uuid,
  p_include_scenarios boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  core jsonb;
  result jsonb;
BEGIN
  core := public.get_session_core(p_session_id);
  IF core IS NULL THEN
    RETURN NULL;
  END IF;

  result := core;

  IF p_include_scenarios THEN
    result := result || jsonb_build_object(
      'scenarios', public.get_session_scenarios(p_session_id)
    );
  END IF;

  RETURN result;
END;
$$;
