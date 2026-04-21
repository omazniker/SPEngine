"use client";

import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * DataTable — Pflicht-Tabelle für alle Listen (AGENTS.md §"UI Patterns").
 *
 * Klickbare Rows mit Keyboard-Support, data-testid pro Row, Empty-State,
 * Loading-Skeleton als externes Pattern (via `isLoading` + `skeleton`).
 *
 * **Status:** Lightweight-Variante. Für Sorting/Filtering/Pagination später
 * auf `@tanstack/react-table` heben.
 */

export interface ColumnDef<TRow> {
  id: string;
  header: ReactNode;
  cell: (row: TRow) => ReactNode;
  className?: string;
  headClassName?: string;
}

export interface DataTableProps<TRow> {
  columns: ColumnDef<TRow>[];
  rows: TRow[];
  getRowId: (row: TRow) => string;
  onRowClick?: (row: TRow) => void;
  isLoading?: boolean;
  skeleton?: ReactNode;
  emptyState?: ReactNode;
  /** Prefix für `data-testid`. Beispiel: `sourcings` → `sourcings-row-{id}`. */
  testIdPrefix: string;
  className?: string;
}

export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  onRowClick,
  isLoading,
  skeleton,
  emptyState,
  testIdPrefix,
  className,
}: DataTableProps<TRow>) {
  if (isLoading) {
    return <div data-testid={`${testIdPrefix}-loading`}>{skeleton}</div>;
  }

  if (rows.length === 0) {
    return (
      <div data-testid={`${testIdPrefix}-empty`} className="rounded-lg border p-8 text-center">
        {emptyState ?? <p className="text-sm text-muted-foreground">Keine Einträge vorhanden.</p>}
      </div>
    );
  }

  return (
    <Table data-testid={`${testIdPrefix}-table`} className={cn("w-full", className)}>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.id} className={col.headClassName}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const id = getRowId(row);
          const clickable = !!onRowClick;
          return (
            <TableRow
              key={id}
              data-testid={`${testIdPrefix}-row-${id}`}
              className={clickable ? "cursor-pointer" : undefined}
              onClick={clickable ? () => onRowClick(row) : undefined}
              onKeyDown={
                clickable
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              tabIndex={clickable ? 0 : undefined}
              role={clickable ? "button" : undefined}
            >
              {columns.map((col) => (
                <TableCell key={col.id} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
