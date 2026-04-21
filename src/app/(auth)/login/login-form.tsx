"use client";

import { useRouter } from "next/navigation";

import { z } from "zod";

import { GenericForm, GenericFormSubmit } from "@/components/form/generic-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction } from "./actions";

const schema = z.object({
  email: z.string().email("Ungültige E-Mail"),
  password: z.string().min(6, "Mindestens 6 Zeichen"),
});

export function LoginForm() {
  const router = useRouter();

  return (
    <GenericForm
      testId="login-form"
      schema={schema}
      successToast="Angemeldet"
      action={async (data) => {
        const result = await loginAction(data);
        if ("error" in result) return { error: result.error };
        return { data: result.data };
      }}
      onSuccess={() => router.push("/")}
      className="w-full max-w-sm gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">E-Mail</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          data-testid="login-email-input"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password">Passwort</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          data-testid="login-password-input"
        />
      </div>
      <GenericFormSubmit data-testid="login-submit-button">Anmelden</GenericFormSubmit>
    </GenericForm>
  );
}
