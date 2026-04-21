"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

import type { SessionListItem } from "../../types/session";
import type { GetSessionsResult } from "./types";

/**
 * Lädt die Sessions-Liste des eingeloggten Users (RLS erzwungen, zusätzlich im RPC gefiltert).
 * Nur `supabase.rpc()`, keine eigenen Queries (AGENTS.md §"Server Actions").
 */
export async function getSessionsAction(): Promise<GetSessionsResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_sessions");

  if (error) return { error: error.message };
  return { data: (data ?? []) as SessionListItem[] };
}
