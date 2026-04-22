"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";
import type { Json } from "@/types/supabase";

import { uploadUniverseProfileSchema } from "./schema";
import type {
  UploadUniverseProfileInput,
  UploadUniverseProfileResult,
} from "./types";

/**
 * Erzeugt ein UniverseProfile aus bereits geparsten Bonds (JSON-String).
 * Der Caller (Client-Component) parst die XLSX clientseitig mit
 * `parseUniverseXlsx` und reicht das Ergebnis als String durch — so müssen
 * Binary-Buffer nicht durch die Server-Action-Serialisierung.
 */
export async function uploadUniverseProfileAction(
  input: UploadUniverseProfileInput,
): Promise<UploadUniverseProfileResult> {
  const parsed = uploadUniverseProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  let bonds: unknown;
  try {
    bonds = JSON.parse(parsed.data.bondsJson);
  } catch {
    return { error: "Bonds-JSON ist kein gültiges JSON" };
  }
  if (!Array.isArray(bonds)) {
    return { error: "Bonds-JSON muss ein Array sein" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert. Siehe .env.local.example." };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_universe_profile", {
    p_name: parsed.data.name,
    p_bonds: bonds as Json,
    p_source_file: parsed.data.sourceFile ?? undefined,
  });

  if (error) return { error: error.message };

  revalidatePath("/universe");
  return {
    data: {
      universeProfileId: data as string,
      bondCount: bonds.length,
    },
  };
}
