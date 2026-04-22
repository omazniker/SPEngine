-- Purpose:      Update-Pfad für scenarios.config — UI-Editor zum Auswählen von Bonds etc.
-- Changes:      update_scenario_config (SECURITY DEFINER) — akzeptiert nur DRAFT-Scenarios,
--               Ownership-Check via Session-Parent. SAVED-Scenarios sind immutable Snapshots.
-- Dependencies: scenarios-Tabelle (20260421120200), sessions (20260421120100).

CREATE OR REPLACE FUNCTION public.update_scenario_config(
  p_scenario_id uuid,
  p_config jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht eingeloggt' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_config) <> 'object' THEN
    RAISE EXCEPTION 'config muss ein JSON-Objekt sein' USING ERRCODE = '22000';
  END IF;

  UPDATE public.scenarios sc
     SET config = p_config
   WHERE sc.id = p_scenario_id
     AND sc.status = 'DRAFT'
     AND EXISTS (
       SELECT 1 FROM public.sessions s
        WHERE s.id = sc.session_id
          AND s.user_id = v_user_id
     );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Szenario nicht im Status DRAFT oder keine Berechtigung'
      USING ERRCODE = '42501';
  END IF;
END;
$$;
