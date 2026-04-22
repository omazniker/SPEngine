import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { getUniverseProfileAction, type UniverseBond } from "@/features/universe";

import { BondsTable } from "./bonds-table";
import { DeleteUniverseButton } from "./delete-universe-button";

export const metadata: Metadata = {
  title: "Universum — SPEngine",
};

export const dynamic = "force-dynamic";

export default async function UniverseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getUniverseProfileAction({ universeProfileId: id });

  if ("error" in result && result.error) {
    return (
      <main
        data-testid="universe-detail-page"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10"
      >
        <Button
          variant="ghost"
          nativeButton={false}
          render={
            <Link href="/universe" data-testid="universe-detail-back">
              <ArrowLeftIcon />
              Zurück
            </Link>
          }
        />
        <div
          data-testid="universe-detail-error"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {result.error}
        </div>
      </main>
    );
  }

  const profile = result.data;
  if (!profile) notFound();

  const bonds = (profile.bonds ?? []) as UniverseBond[];

  return (
    <main
      data-testid="universe-detail-page"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10"
    >
      <div>
        <Button
          variant="ghost"
          nativeButton={false}
          render={
            <Link href="/universe" data-testid="universe-detail-back">
              <ArrowLeftIcon />
              Zurück
            </Link>
          }
        />
      </div>

      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{profile.name}</h1>
          <p
            className="text-xs text-muted-foreground tabular-nums"
            data-testid="universe-detail-id"
          >
            ID: {profile.id}
          </p>
          <p className="flex gap-4 text-xs text-muted-foreground">
            <span data-testid="universe-detail-bond-count">
              <strong className="font-medium text-foreground">{profile.bond_count}</strong>{" "}
              {profile.bond_count === 1 ? "Bond" : "Bonds"}
            </span>
            {profile.source_file && (
              <span data-testid="universe-detail-source">Quelle: {profile.source_file}</span>
            )}
            <span>Erstellt: {formatDateTime(profile.created_at)}</span>
          </p>
        </div>
        <DeleteUniverseButton universeProfileId={profile.id} universeName={profile.name} />
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Bonds</h2>
        <BondsTable bonds={bonds} />
      </section>
    </main>
  );
}
