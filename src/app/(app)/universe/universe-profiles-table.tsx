"use client";

import { useRouter } from "next/navigation";

import { StarIcon } from "lucide-react";

import { DataTable, type ColumnDef } from "@/components/table/data-table";
import type { UniverseProfileListItem } from "@/features/universe";
import { formatDateTime } from "@/lib/format";

export function UniverseProfilesTable({ rows }: { rows: UniverseProfileListItem[] }) {
  const router = useRouter();

  const columns: ColumnDef<UniverseProfileListItem>[] = [
    {
      id: "name",
      header: "Name",
      cell: (row) => (
        <span className="flex items-center gap-2 font-medium">
          {row.is_default && (
            <StarIcon
              className="size-4 text-amber-500"
              data-testid={`universe-default-star-${row.id}`}
              aria-label="Standard-Universum"
            />
          )}
          {row.name}
        </span>
      ),
    },
    {
      id: "bonds",
      header: "Bonds",
      cell: (row) => <span className="tabular-nums">{row.bond_count}</span>,
      className: "text-right",
      headClassName: "text-right",
    },
    {
      id: "source",
      header: "Quelle",
      cell: (row) => (
        <span className="text-muted-foreground">{row.source_file ?? "—"}</span>
      ),
    },
    {
      id: "created",
      header: "Erstellt",
      cell: (row) => (
        <span className="text-muted-foreground">{formatDateTime(row.created_at)}</span>
      ),
    },
  ];

  return (
    <DataTable<UniverseProfileListItem>
      testIdPrefix="universe"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/universe/${row.id}`)}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">Noch keine Universe-Profile angelegt.</p>
          <p className="text-xs text-muted-foreground">
            Oben rechts auf „Neues Universum“ klicken.
          </p>
        </div>
      }
    />
  );
}
