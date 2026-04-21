"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server-client";

const signupSchema = z.object({
  email: z.string().email("Ungültige E-Mail"),
  password: z.string().min(6, "Mindestens 6 Zeichen"),
  company: z.string().min(1, "Firmenname erforderlich").optional(),
});

export type SignupResult =
  | { data: { userId: string; confirmationRequired: boolean }; error?: never }
  | { error: string };

export async function signupAction(input: {
  email: string;
  password: string;
  company?: string;
}): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  const { supabase } = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: parsed.data.company ? { company: parsed.data.company } : undefined,
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Registrierung fehlgeschlagen — kein User zurückgegeben" };

  revalidatePath("/", "layout");
  return {
    data: {
      userId: data.user.id,
      // Supabase liefert bei aktivierter Email-Confirmation KEINE Session zurück.
      confirmationRequired: !data.session,
    },
  };
}
