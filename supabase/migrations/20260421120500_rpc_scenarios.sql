-- Purpose:      RPCs für das scenarios-Feature.
-- Changes:      get_scenarios (Liste je Session), create_scenario (Insert DRAFT),
--               save_scenario (DRAFT → SAVED), delete_scenario.
-- Dependencies: scenarios-Tabelle (20260421120200), sessions (20260421120100).

-- Atomar: Szenarien einer Session (RLS erzwingt Ownership über Session-FK).
CREATE OR REPLACE FUNCTION public.get_scenarios(p_session_id uuid)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  name text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT s.id, s.session_id, s.name, s.status, s.created_at, s.updated_at
  FROM public.scenarios s
  WHERE s.session_id = p_session_id
  ORDER BY s.created_at ASC;
$$;

-- create_scenario: Status initial DRAFT.
CREATE OR REPLACE FUNCTION public.create_scenario(
  p_session_id uuid,
  p_name text,
  p_config jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_id uuid;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht eingeloggt' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.sessions s
     WHERE s.id = p_session_id
       AND s.user_id = v_user_id
       AND s.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Session nicht gefunden, archiviert, oder keine Berechtigung'
      USING ERRCODE = '42501';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Name darf nicht leer sein' USING ERRCODE = '22000';
  END IF;

  INSERT INTO public.scenarios (session_id, name, config)
  VALUES (p_session_id, p_name, COALESCE(p_config, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- save_scenario: DRAFT → SAVED. Idempotent gegen doppelte Aufrufe (schon SAVED → Fehler mit klarer Message).
CREATE OR REPLACE FUNCTION public.save_scenario(p_scenario_id uuid)
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

  UPDATE public.scenarios sc
     SET status = 'SAVED'
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

-- delete_scenario: RLS macht den Owner-Check, aber SECURITY DEFINER erlaubt bessere Fehlermeldung.
CREATE OR REPLACE FUNCTION public.delete_scenario(p_scenario_id uuid)
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

  DELETE FROM public.scenarios sc
  WHERE sc.id = p_scenario_id
    AND EXISTS (
      SELECT 1 FROM public.sessions s
       WHERE s.id = sc.session_id
         AND s.user_id = v_user_id
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Szenario nicht gefunden oder keine Berechtigung'
      USING ERRCODE = '42501';
  END IF;
END;
$$;
