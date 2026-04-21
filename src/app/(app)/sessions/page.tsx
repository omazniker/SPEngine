import type { Metadata } from "next";

import { getSessionsAction } from "@/features/sessions";

import { CreateSessionButton } from "./create-session-button";
import { SessionsTable } from "./sessions-table";

export const metadata: Metadata = {
  title: "Sessions — SPEngine",
};

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const result = await getSessionsAction();

  return (
    <main
      data-testid="sessions-page"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10"
    >
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Arbeitssessions mit Portfolio, Constraints und Szenarien.
          </p>
        </div>
        <CreateSessionButton />
      </header>

      {"error" in result ? (
        <div
          data-testid="sessions-error"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {result.error}
        </div>
      ) : (
        <SessionsTable rows={result.data} />
      )}
    </main>
  );
}
