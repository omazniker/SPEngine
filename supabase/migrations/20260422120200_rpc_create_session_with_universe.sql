-- Purpose:      Erweitert create_session um optionales Universe-Profil-Binding.
-- Changes:      DROP + CREATE OR REPLACE für create_session — DROP ist nötig, weil die alte
--               1-arg-Signatur sonst bei RPC-Auflösung gewinnt. Neue Signatur mit DEFAULT NULL
--               bleibt aus Client-Sicht kompatibel (nur p_name genügt).
-- Dependencies: universe_profiles (20260422120000), create_session (20260421120400).

DROP FUNCTION IF EXISTS public.create_session(text);

CREATE OR REPLACE FUNCTION public.create_session(
  p_name text,
  p_universe_profile_id uuid DEFAULT NULL
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

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Name darf nicht leer sein' USING ERRCODE = '22000';
  END IF;

  -- Universe-Profil muss existieren und dem User gehören, sonst 42501.
  -- SECURITY DEFINER umgeht RLS, deshalb die Eigentümer-Prüfung hier explizit.
  IF p_universe_profile_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.universe_profiles
       WHERE id = p_universe_profile_id
         AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Universe-Profil nicht gefunden oder nicht berechtigt'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.sessions (user_id, name, universe_profile_id)
  VALUES (v_user_id, p_name, p_universe_profile_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
