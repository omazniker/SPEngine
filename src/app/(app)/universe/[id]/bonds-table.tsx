"use client";

import { DataTable, type ColumnDef } from "@/components/table/data-table";
import type { UniverseBond } from "@/features/universe";

const MAX_COLUMNS = 10;

/**
 * Zeigt die Bonds eines UniverseProfiles in einer Tabelle. Spalten werden
 * aus der Vereinigung der Keys aller Bond-Records abgeleitet und auf
 * `MAX_COLUMNS` begrenzt, damit ein sehr breiter Bloomberg-Export die Tabelle
 * nicht unlesbar macht.
 */
export function BondsTable({ bonds }: { bonds: UniverseBond[] }) {
  const columnKeys = deriveColumnKeys(bonds);

  const columns: ColumnDef<UniverseBond & { __row_index: number }>[] = columnKeys.map((key) => ({
    id: key,
    header: key,
    cell: (row) => renderCell(row[key]),
  }));

  const rowsWithIndex = bonds.map((bond, index) => ({ ...bond, __row_index: index }));

  return (
    <DataTable
      testIdPrefix="bonds"
      columns={columns}
      rows={rowsWithIndex}
      getRowId={(row) => String(row.__row_index)}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Dieses Universum enthält keine Bonds.
          </p>
          <p className="text-xs text-muted-foreground">
            Universe wurde ohne Datei angelegt (leerer Snapshot).
          </p>
        </div>
      }
    />
  );
}

function deriveColumnKeys(bonds: UniverseBond[]): string[] {
  if (bonds.length === 0) return [];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const bond of bonds) {
    for (const key of Object.keys(bond)) {
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
        if (ordered.length >= MAX_COLUMNS) return ordered;
      }
    }
  }
  return ordered;
}

function renderCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}
