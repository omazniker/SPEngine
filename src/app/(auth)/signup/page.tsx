import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Registrieren — SPEngine",
};

export default function SignupPage() {
  return (
    <main
      data-testid="signup-page"
      className="flex min-h-[calc(100vh-2rem)] flex-1 items-center justify-center p-8"
    >
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Registrieren</h1>
          <p className="text-sm text-muted-foreground">
            Neues SPEngine-Konto anlegen. Nach Registrierung E-Mail bestätigen.
          </p>
        </header>
        <SignupForm />
        <p className="text-sm text-muted-foreground">
          Bereits registriert?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4"
            data-testid="signup-login-link"
          >
            Zum Login
          </Link>
        </p>
      </div>
    </main>
  );
}
