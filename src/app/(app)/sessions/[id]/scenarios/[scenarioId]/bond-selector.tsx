"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateScenarioConfigAction } from "@/features/scenarios";
import type { UniverseBond } from "@/features/universe";

const MAX_PREVIEW_COLUMNS = 3;

type BondWithIsin = UniverseBond & { ISIN: string };

function extractIsin(bond: UniverseBond): string | null {
  const raw = bond.ISIN ?? bond.isin;
  if (typeof raw !== "string") return null;
  return raw.trim() || null;
}

/**
 * Client-Component: Bond-Auswahl-Editor für DRAFT-Scenarios. Rendert eine
 * Checkbox-Liste der Bonds aus dem Session-Universum; Save persistiert
 * `config.selectedIsins` via Server-Action.
 */
export function BondSelector({
  scenarioId,
  bonds,
  initialSelectedIsins,
}: {
  scenarioId: string;
  bonds: UniverseBond[];
  initialSelectedIsins: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelectedIsins));
  const [isPending, startTransition] = useTransition();

  // Bonds ohne ISIN lassen sich nicht selektieren — herausfiltern, damit der
  // Nutzer nicht auf leere Checkboxen klickt. bond_count in der Tabelle bleibt
  // als Gesamtzahl stehen, damit die Diskrepanz nicht verwirrt.
  const selectableBonds: BondWithIsin[] = bonds.flatMap((bond) => {
    const isin = extractIsin(bond);
    return isin ? [{ ...bond, ISIN: isin }] : [];
  });

  const previewKeys = derivePreviewKeys(selectableBonds);

  function toggle(isin: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(isin)) next.delete(isin);
      else next.add(isin);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateScenarioConfigAction({
        scenarioId,
        config: { selectedIsins: Array.from(selected).sort() },
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Auswahl gespeichert");
      router.refresh();
    });
  }

  if (selectableBonds.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="bond-selector-no-bonds"
      >
        Das Universum enthält keine Bonds mit ISIN — nichts auszuwählen.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="bond-selector">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2" />
              <th className="px-3 py-2 text-left">ISIN</th>
              {previewKeys.map((key) => (
                <th key={key} className="px-3 py-2 text-left">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selectableBonds.map((bond) => {
              const checked = selected.has(bond.ISIN);
              return (
                <tr
                  key={bond.ISIN}
                  data-testid={`bond-row-${bond.ISIN}`}
                  className="border-t"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(bond.ISIN)}
                      data-testid={`bond-checkbox-${bond.ISIN}`}
                      aria-label={`Bond ${bond.ISIN} auswählen`}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{bond.ISIN}</td>
                  {previewKeys.map((key) => (
                    <td key={key} className="px-3 py-2">
                      {renderCell(bond[key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground" data-testid="bond-selector-count">
          {selected.size} von {selectableBonds.length} ausgewählt
        </span>
        <Button
          onClick={handleSave}
          disabled={isPending}
          data-testid="bond-selector-save"
        >
          <SaveIcon />
          Auswahl speichern
        </Button>
      </div>
    </div>
  );
}

/**
 * Read-only Anzeige für SAVED-Scenarios — listet die eingefrorenen ISINs.
 */
export function SelectedBondsReadonly({ selectedIsins }: { selectedIsins: string[] }) {
  if (selectedIsins.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="bond-selector-readonly-empty">
        Keine Bonds ausgewählt.
      </p>
    );
  }
  return (
    <ul
      className="flex flex-wrap gap-2"
      data-testid="bond-selector-readonly"
    >
      {selectedIsins.map((isin) => (
        <li
          key={isin}
          className="rounded-md border px-2 py-1 font-mono text-xs"
          data-testid={`bond-selected-${isin}`}
        >
          {isin}
        </li>
      ))}
    </ul>
  );
}

function derivePreviewKeys(bonds: BondWithIsin[]): string[] {
  const seen = new Set<string>(["ISIN"]);
  const ordered: string[] = [];
  for (const bond of bonds) {
    for (const key of Object.keys(bond)) {
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
        if (ordered.length >= MAX_PREVIEW_COLUMNS) return ordered;
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
