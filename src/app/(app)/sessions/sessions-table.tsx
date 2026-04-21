"use client";

import { useRouter } from "next/navigation";

import { DataTable, type ColumnDef } from "@/components/table/data-table";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { SESSION_STATUS, type SessionListItem, type SessionStatus } from "@/features/sessions";
import { formatDateTime } from "@/lib/format";

import { SessionRowActions } from "./session-row-actions";

const STATUS_TONES: Record<SessionStatus, StatusTone> = {
  [SESSION_STATUS.ACTIVE]: "success",
  [SESSION_STATUS.ARCHIVED]: "neutral",
};

const STATUS_LABELS: Record<SessionStatus, string> = {
  [SESSION_STATUS.ACTIVE]: "Aktiv",
  [SESSION_STATUS.ARCHIVED]: "Archiviert",
};

export function SessionsTable({ rows }: { rows: SessionListItem[] }) {
  const router = useRouter();

  const columns: ColumnDef<SessionListItem>[] = [
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
      id: "scenarios",
      header: "Szenarien",
      cell: (row) => <span className="tabular-nums">{row.scenario_count}</span>,
      className: "text-right",
      headClassName: "text-right",
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
      cell: (row) => <SessionRowActions row={row} />,
      className: "text-right",
      headClassName: "text-right w-12",
    },
  ];

  return (
    <DataTable<SessionListItem>
      testIdPrefix="sessions"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/sessions/${row.id}`)}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">Noch keine Sessions angelegt.</p>
          <p className="text-xs text-muted-foreground">Oben rechts auf „Neue Session“ klicken.</p>
        </div>
      }
    />
  );
}
