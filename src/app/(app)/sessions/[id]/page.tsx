import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { getScenariosAction } from "@/features/scenarios";
import { getSessionAction, SESSION_STATUS, type SessionStatus } from "@/features/sessions";

import { CreateScenarioButton } from "./create-scenario-button";
import { ScenariosTable } from "./scenarios-table";

export const metadata: Metadata = {
  title: "Session — SPEngine",
};

export const dynamic = "force-dynamic";

const SESSION_STATUS_TONES: Record<SessionStatus, StatusTone> = {
  [SESSION_STATUS.ACTIVE]: "success",
  [SESSION_STATUS.ARCHIVED]: "neutral",
};

const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  [SESSION_STATUS.ACTIVE]: "Aktiv",
  [SESSION_STATUS.ARCHIVED]: "Archiviert",
};

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [sessionResult, scenariosResult] = await Promise.all([
    getSessionAction({ sessionId: id }),
    getScenariosAction({ sessionId: id }),
  ]);

  // Wenn beides mit einem Supabase-Config-Fehler fehlschlägt, rendern wir einen
  // sichtbaren Config-Hinweis — hilfreich in der lokalen Dev-Experience ohne .env.local.
  if ("error" in sessionResult && "error" in scenariosResult) {
    return (
      <main
        data-testid="session-detail-page"
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10"
      >
        <Button
          variant="ghost"
          nativeButton={false}
          render={
            <Link href="/sessions" data-testid="session-detail-back">
              <ArrowLeftIcon />
              Zurück
            </Link>
          }
        />
        <div
          data-testid="session-detail-error"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {sessionResult.error}
        </div>
      </main>
    );
  }

  if ("error" in sessionResult && sessionResult.error) {
    // Kein Doppel-Fehler mehr (oben abgefangen) — einzelner Fehler bleibt hier.
    throw new Error(sessionResult.error);
  }
  const session = sessionResult.data;
  if (!session) {
    notFound();
  }
  const scenarios =
    "data" in scenariosResult && scenariosResult.data ? scenariosResult.data : [];

  return (
    <main
      data-testid="session-detail-page"
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10"
    >
      <div>
        <Button
          variant="ghost"
          nativeButton={false}
          render={
            <Link href="/sessions" data-testid="session-detail-back">
              <ArrowLeftIcon />
              Zurück
            </Link>
          }
        />
      </div>

      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{session.name}</h1>
            <StatusBadge tone={SESSION_STATUS_TONES[session.status]}>
              {SESSION_STATUS_LABELS[session.status]}
            </StatusBadge>
          </div>
          <p
            className="text-xs text-muted-foreground tabular-nums"
            data-testid="session-detail-id"
          >
            ID: {session.id}
          </p>
        </div>
        <CreateScenarioButton sessionId={session.id} disabled={session.status !== "ACTIVE"} />
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Szenarien</h2>
        <ScenariosTable rows={scenarios} />
      </section>
    </main>
  );
}
