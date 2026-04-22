"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import type { UniverseProfileListItem } from "../../types/universe-profile";
import type { GetUniverseProfilesResult } from "./types";

/**
 * Lädt die UniverseProfile-Liste des eingeloggten Users (RLS erzwungen + RPC filtert).
 * Nur Metadaten — der bonds-Payload wird via `get_universe_profile(id)` separat geladen.
 */
export async function getUniverseProfilesAction(): Promise<GetUniverseProfilesResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_universe_profiles");

  if (error) return { error: error.message };
  return { data: (data ?? []) as UniverseProfileListItem[] };
}
