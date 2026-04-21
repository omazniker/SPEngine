"use client";

import { useRouter } from "next/navigation";

import { z } from "zod";

import { GenericForm, GenericFormSubmit } from "@/components/form/generic-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signupAction } from "./actions";

const schema = z.object({
  email: z.string().email("Ungültige E-Mail"),
  password: z.string().min(6, "Mindestens 6 Zeichen"),
  company: z
    .string()
    .transform((val) => (val === "" ? undefined : val))
    .optional(),
});

export function SignupForm() {
  const router = useRouter();

  return (
    <GenericForm
      testId="signup-form"
      schema={schema}
      successToast="Registrierung erfolgreich — prüfe deine E-Mail."
      action={async (data) => {
        const result = await signupAction(data);
        if ("error" in result) return { error: result.error };
        return { data: result.data };
      }}
      onSuccess={(result) => {
        const res = result as { userId: string; confirmationRequired: boolean };
        router.push(res.confirmationRequired ? "/login?confirm=1" : "/");
      }}
      className="w-full max-w-sm gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-email">E-Mail</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          data-testid="signup-email-input"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-password">Passwort</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={6}
          data-testid="signup-password-input"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-company">Firma (optional)</Label>
        <Input
          id="signup-company"
          name="company"
          type="text"
          autoComplete="organization"
          data-testid="signup-company-input"
        />
      </div>
      <GenericFormSubmit data-testid="signup-submit-button">Registrieren</GenericFormSubmit>
    </GenericForm>
  );
}
