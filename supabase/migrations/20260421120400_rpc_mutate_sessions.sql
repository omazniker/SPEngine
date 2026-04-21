-- Purpose:      Mutations-RPCs für sessions: create_session, archive_session, restore_session.
-- Changes:      SECURITY DEFINER wrapper, die user_id aus auth.uid() setzen und Status-Übergänge kapseln.
-- Dependencies: sessions-Tabelle (20260421120100).

-- create_session: legt eine neue Session mit status=ACTIVE an. user_id kommt vom Auth-Context.
CREATE OR REPLACE FUNCTION public.create_session(p_name text)
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

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Name darf nicht leer sein' USING ERRCODE = '22000';
  END IF;

  INSERT INTO public.sessions (user_id, name)
  VALUES (v_user_id, p_name)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- archive_session: setzt status=ARCHIVED. Nur eigene Sessions, nur wenn aktuell ACTIVE.
CREATE OR REPLACE FUNCTION public.archive_session(p_session_id uuid)
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

  UPDATE public.sessions
     SET status = 'ARCHIVED'
   WHERE id = p_session_id
     AND user_id = v_user_id
     AND status = 'ACTIVE';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session nicht im Status ACTIVE oder nicht berechtigt' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- restore_session: setzt status=ACTIVE. Nur eigene Sessions, nur wenn aktuell ARCHIVED.
CREATE OR REPLACE FUNCTION public.restore_session(p_session_id uuid)
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

  UPDATE public.sessions
     SET status = 'ACTIVE'
   WHERE id = p_session_id
     AND user_id = v_user_id
     AND status = 'ARCHIVED';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session nicht im Status ARCHIVED oder nicht berechtigt' USING ERRCODE = '42501';
  END IF;
END;
$$;
