import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { getSessionAction } from "@/features/sessions";
import {
  getScenarioAction,
  SCENARIO_STATUS,
  type ScenarioStatus,
} from "@/features/scenarios";
import { getUniverseProfileAction, type UniverseBond } from "@/features/universe";

import { BondSelector, SelectedBondsReadonly } from "./bond-selector";

export const metadata: Metadata = {
  title: "Szenario — SPEngine",
};

export const dynamic = "force-dynamic";

const STATUS_TONES: Record<ScenarioStatus, StatusTone> = {
  [SCENARIO_STATUS.DRAFT]: "pending",
  [SCENARIO_STATUS.SAVED]: "success",
};

const STATUS_LABELS: Record<ScenarioStatus, string> = {
  [SCENARIO_STATUS.DRAFT]: "Entwurf",
  [SCENARIO_STATUS.SAVED]: "Gespeichert",
};

export default async function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string; scenarioId: string }>;
}) {
  const { id: sessionId, scenarioId } = await params;
  const [scenarioResult, sessionResult] = await Promise.all([
    getScenarioAction({ scenarioId }),
    getSessionAction({ sessionId }),
  ]);

  if ("error" in scenarioResult && scenarioResult.error) {
    return (
      <main
        data-testid="scenario-detail-page"
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10"
      >
        <Button
          variant="ghost"
          nativeButton={false}
          render={
            <Link href={`/sessions/${sessionId}`} data-testid="scenario-detail-back">
              <ArrowLeftIcon />
              Zurück zur Session
            </Link>
          }
        />
        <div
          data-testid="scenario-detail-error"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {scenarioResult.error}
        </div>
      </main>
    );
  }

  const scenario = scenarioResult.data;
  if (!scenario) notFound();

  // Bonds aus dem Session-Universum laden, wenn verknüpft.
  const session = "data" in sessionResult ? sessionResult.data : null;
  const universeProfileId = session?.universe_profile_id ?? null;

  let bonds: UniverseBond[] = [];
  if (universeProfileId) {
    const universeResult = await getUniverseProfileAction({
      universeProfileId,
    });
    if (!("error" in universeResult) && universeResult.data) {
      bonds = (universeResult.data.bonds ?? []) as UniverseBond[];
    }
  }

  const selectedIsins = Array.isArray(scenario.config.selectedIsins)
    ? scenario.config.selectedIsins.filter((v): v is string => typeof v === "string")
    : [];
  const isDraft = scenario.status === SCENARIO_STATUS.DRAFT;

  return (
    <main
      data-testid="scenario-detail-page"
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10"
    >
      <div>
        <Button
          variant="ghost"
          nativeButton={false}
          render={
            <Link href={`/sessions/${sessionId}`} data-testid="scenario-detail-back">
              <ArrowLeftIcon />
              Zurück zur Session
            </Link>
          }
        />
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{scenario.name}</h1>
          <StatusBadge tone={STATUS_TONES[scenario.status]}>
            {STATUS_LABELS[scenario.status]}
          </StatusBadge>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums" data-testid="scenario-detail-id">
          ID: {scenario.id}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Bonds</h2>
        {!universeProfileId ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="scenario-no-universe"
          >
            Diese Session hat kein verknüpftes Universum — Bonds werden erst verfügbar,
            sobald beim Anlegen einer Session ein Universum gewählt wird.
          </p>
        ) : isDraft ? (
          <BondSelector
            scenarioId={scenario.id}
            bonds={bonds}
            initialSelectedIsins={selectedIsins}
          />
        ) : (
          <SelectedBondsReadonly selectedIsins={selectedIsins} />
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border p-4" data-testid="scenario-config">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Config</h2>
          <pre className="max-h-48 overflow-auto text-xs">
            {JSON.stringify(scenario.config, null, 2)}
          </pre>
        </div>
        <div className="rounded-lg border p-4" data-testid="scenario-stats">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Stats</h2>
          <pre className="max-h-48 overflow-auto text-xs">
            {JSON.stringify(scenario.stats, null, 2)}
          </pre>
        </div>
        <div className="rounded-lg border p-4" data-testid="scenario-result">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            Result ({Array.isArray(scenario.result) ? scenario.result.length : 0} Positionen)
          </h2>
          <pre className="max-h-48 overflow-auto text-xs">
            {JSON.stringify(scenario.result, null, 2)}
          </pre>
        </div>
      </section>
    </main>
  );
}
