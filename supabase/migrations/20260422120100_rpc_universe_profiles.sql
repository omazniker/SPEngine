-- Purpose:      RPCs für universe_profiles: Liste (Metadaten) + Detail (mit Bonds) + Create + Delete.
-- Changes:      get_universe_profiles (Metadaten, ohne bonds-Payload), get_universe_profile (mit bonds),
--               create_universe_profile (SECURITY DEFINER, user_id aus auth.uid()),
--               delete_universe_profile (SECURITY DEFINER, user_id-Check).
-- Dependencies: universe_profiles-Tabelle (20260422120000).

-- Liste ohne bonds-Payload — der ist potentiell groß (tausende Bonds pro Profil).
CREATE OR REPLACE FUNCTION public.get_universe_profiles()
RETURNS TABLE (
  id uuid,
  name text,
  bond_count integer,
  source_file text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT id, name, bond_count, source_file, created_at
  FROM public.universe_profiles
  WHERE user_id = (SELECT auth.uid())
  ORDER BY created_at DESC;
$$;

-- Detail inkl. bonds — explizit aufrufen wenn der Payload gebraucht wird.
CREATE OR REPLACE FUNCTION public.get_universe_profile(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT to_jsonb(u)
  FROM public.universe_profiles u
  WHERE u.id = p_id
    AND u.user_id = (SELECT auth.uid());
$$;

-- create_universe_profile: user_id aus auth.uid(), bond_count wird aus JSON-Länge abgeleitet.
CREATE OR REPLACE FUNCTION public.create_universe_profile(
  p_name text,
  p_bonds jsonb DEFAULT '[]'::jsonb,
  p_source_file text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_id uuid;
  v_bond_count integer;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht eingeloggt' USING ERRCODE = '42501';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Name darf nicht leer sein' USING ERRCODE = '22000';
  END IF;

  IF jsonb_typeof(p_bonds) <> 'array' THEN
    RAISE EXCEPTION 'bonds muss ein JSON-Array sein' USING ERRCODE = '22000';
  END IF;

  v_bond_count := jsonb_array_length(p_bonds);

  INSERT INTO public.universe_profiles (user_id, name, bonds, bond_count, source_file)
  VALUES (v_user_id, p_name, p_bonds, v_bond_count, p_source_file)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- delete_universe_profile: eigener nur. Per FK ON DELETE SET NULL wird
-- sessions.universe_profile_id automatisch genullt statt die Session zu killen.
CREATE OR REPLACE FUNCTION public.delete_universe_profile(p_id uuid)
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

  DELETE FROM public.universe_profiles
   WHERE id = p_id
     AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil nicht gefunden oder nicht berechtigt' USING ERRCODE = '42501';
  END IF;
END;
$$;
