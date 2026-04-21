import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import {
  getScenarioAction,
  SCENARIO_STATUS,
  type ScenarioStatus,
} from "@/features/scenarios";

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
  const result = await getScenarioAction({ scenarioId });

  if ("error" in result && result.error) {
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
          {result.error}
        </div>
      </main>
    );
  }

  const scenario = result.data;
  if (!scenario) notFound();

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
