-- Purpose:      Legt die profiles-Tabelle an (Spiegel von auth.users mit App-spezifischen Feldern).
-- Changes:      CREATE TABLE profiles + Trigger, der auf auth.users-Insert einen Profile-Eintrag erzeugt.
-- Dependencies: Keine (erste Migration). Supabase Auth muss aktiviert sein.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  company text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Eigener Profile-Eintrag lesen + aktualisieren.
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Trigger: automatische Profile-Erstellung nach Signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, company, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'company',
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: email_verified synchron halten, wenn Supabase die Email bestätigt.
CREATE OR REPLACE FUNCTION public.sync_email_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET email_verified = NEW.email_confirmed_at IS NOT NULL,
         updated_at = now()
   WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS DISTINCT FROM OLD.email_confirmed_at)
  EXECUTE FUNCTION public.sync_email_verified();
