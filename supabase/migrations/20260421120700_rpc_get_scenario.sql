-- Purpose:      get_scenario RPC. Liefert Scenario-Detail inklusive config/result/stats.
-- Changes:      STABLE SECURITY INVOKER — RLS erzwingt Ownership via FK auf sessions.
-- Dependencies: scenarios (20260421120200).

CREATE OR REPLACE FUNCTION public.get_scenario(p_scenario_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT to_jsonb(s)
  FROM public.scenarios s
  WHERE s.id = p_scenario_id;
$$;
