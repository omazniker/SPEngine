"use client";

import { useRouter } from "next/navigation";

import { DataTable, type ColumnDef } from "@/components/table/data-table";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { SCENARIO_STATUS, type ScenarioListItem, type ScenarioStatus } from "@/features/scenarios";
import { formatDateTime } from "@/lib/format";

import { ScenarioRowActions } from "./scenario-row-actions";

const STATUS_TONES: Record<ScenarioStatus, StatusTone> = {
  [SCENARIO_STATUS.DRAFT]: "pending",
  [SCENARIO_STATUS.SAVED]: "success",
};

const STATUS_LABELS: Record<ScenarioStatus, string> = {
  [SCENARIO_STATUS.DRAFT]: "Entwurf",
  [SCENARIO_STATUS.SAVED]: "Gespeichert",
};

export function ScenariosTable({ rows }: { rows: ScenarioListItem[] }) {
  const router = useRouter();

  const columns: ColumnDef<ScenarioListItem>[] = [
    {
      id: "name",
      header: "Name",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge tone={STATUS_TONES[row.status]}>{STATUS_LABELS[row.status]}</StatusBadge>
      ),
    },
    {
      id: "updated",
      header: "Zuletzt geändert",
      cell: (row) => (
        <span className="text-muted-foreground">{formatDateTime(row.updated_at)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (row) => <ScenarioRowActions row={row} />,
      className: "text-right",
      headClassName: "text-right w-12",
    },
  ];

  return (
    <DataTable<ScenarioListItem>
      testIdPrefix="scenarios"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/sessions/${row.session_id}/scenarios/${row.id}`)}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">Noch keine Szenarien in dieser Session.</p>
          <p className="text-xs text-muted-foreground">
            Mit „Neues Szenario“ ein erstes Szenario anlegen.
          </p>
        </div>
      }
    />
  );
}
