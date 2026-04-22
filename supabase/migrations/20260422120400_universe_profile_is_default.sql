-- Purpose:      is_default-Flag für universe_profiles — pro User max 1 Default.
-- Changes:      ADD COLUMN is_default + partial unique index; RPC toggle_universe_profile_default
--               (atomar: Setzen auf true unsettet alle anderen des Users).
-- Dependencies: universe_profiles-Tabelle (20260422120000).

ALTER TABLE public.universe_profiles
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Partial Unique Index: pro user_id darf nur ein Profil is_default=true haben.
-- Beim "false" greift der Index nicht, mehrfach false ist erlaubt.
CREATE UNIQUE INDEX IF NOT EXISTS universe_profiles_one_default_per_user
  ON public.universe_profiles (user_id)
  WHERE is_default;

-- Atomar: Wenn das Profil derzeit Default ist → unset (is_default = false).
-- Wenn nicht → alle anderen Profile des Users auf false setzen, dann dieses
-- auf true. Beides in einer Transaktion, damit der Unique-Index nicht
-- zwischenzeitlich bricht.
CREATE OR REPLACE FUNCTION public.toggle_universe_profile_default(
  p_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_currently_default boolean;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht eingeloggt' USING ERRCODE = '42501';
  END IF;

  SELECT is_default INTO v_currently_default
    FROM public.universe_profiles
   WHERE id = p_id
     AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil nicht gefunden oder nicht berechtigt'
      USING ERRCODE = '42501';
  END IF;

  IF v_currently_default THEN
    UPDATE public.universe_profiles
       SET is_default = false
     WHERE id = p_id;
    RETURN false;
  ELSE
    -- Erst alle Defaults des Users unsetten (klein, da max 1 existiert) —
    -- dann das Ziel setzen. Innerhalb einer Transaktion ist der Unique-Index
    -- ok, weil er am Ende der Transaktion geprüft wird (bei Postgres DEFERRABLE
    -- wäre explizit, aber unique partial funktioniert hier ohnehin pro Commit).
    UPDATE public.universe_profiles
       SET is_default = false
     WHERE user_id = v_user_id
       AND is_default = true;
    UPDATE public.universe_profiles
       SET is_default = true
     WHERE id = p_id;
    RETURN true;
  END IF;
END;
$$;

-- get_universe_profiles um is_default erweitern. Der bisherige Rückgabetyp hatte das Feld nicht,
-- deshalb DROP + CREATE statt CREATE OR REPLACE (Postgres lehnt Signaturwechsel im CREATE OR REPLACE ab).
DROP FUNCTION IF EXISTS public.get_universe_profiles();

CREATE OR REPLACE FUNCTION public.get_universe_profiles()
RETURNS TABLE (
  id uuid,
  name text,
  bond_count integer,
  source_file text,
  is_default boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT id, name, bond_count, source_file, is_default, created_at
  FROM public.universe_profiles
  WHERE user_id = (SELECT auth.uid())
  ORDER BY is_default DESC, created_at DESC;
$$;
