-- Purpose:      delete_session RPC. Löscht eine Session und via CASCADE alle Scenarios.
-- Changes:      Neue SECURITY DEFINER Funktion, prüft auth.uid() und user_id.
-- Dependencies: sessions (20260421120100), scenarios (20260421120200 — CASCADE via FK).

CREATE OR REPLACE FUNCTION public.delete_session(p_session_id uuid)
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

  DELETE FROM public.sessions
  WHERE id = p_session_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session nicht gefunden oder keine Berechtigung'
      USING ERRCODE = '42501';
  END IF;
END;
$$;
