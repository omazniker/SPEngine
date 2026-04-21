import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Anmelden — SPEngine",
};

export default function LoginPage() {
  return (
    <main
      data-testid="login-page"
      className="flex min-h-[calc(100vh-2rem)] flex-1 items-center justify-center p-8"
    >
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Anmelden</h1>
          <p className="text-sm text-muted-foreground">
            Mit deiner SPEngine-E-Mail und Passwort einloggen.
          </p>
        </header>
        <LoginForm />
      </div>
    </main>
  );
}
