import type { Metadata } from "next";

import { getUniverseProfilesAction } from "@/features/universe";

import { CreateUniverseProfileButton } from "./create-universe-profile-button";
import { UniverseProfilesTable } from "./universe-profiles-table";

export const metadata: Metadata = {
  title: "Universe — SPEngine",
};

export const dynamic = "force-dynamic";

export default async function UniversePage() {
  const result = await getUniverseProfilesAction();

  return (
    <main
      data-testid="universe-page"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10"
    >
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Universe-Profile</h1>
          <p className="text-sm text-muted-foreground">
            Bond-Snapshots — unveränderliche Sammlungen für Portfolio-Optimierung.
          </p>
        </div>
        <CreateUniverseProfileButton />
      </header>

      {"error" in result ? (
        <div
          data-testid="universe-error"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {result.error}
        </div>
      ) : (
        <UniverseProfilesTable rows={result.data} />
      )}
    </main>
  );
}
