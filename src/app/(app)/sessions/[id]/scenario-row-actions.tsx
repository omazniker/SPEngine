"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { MoreHorizontalIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteScenarioAction,
  hasScenarioCapability,
  saveScenarioAction,
  type ScenarioListItem,
} from "@/features/scenarios";

export function ScenarioRowActions({ row }: { row: ScenarioListItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = hasScenarioCapability(row.status, "save");
  const canDelete = hasScenarioCapability(row.status, "delete");

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveScenarioAction({
        scenarioId: row.id,
        sessionId: row.session_id,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Szenario gespeichert");
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteScenarioAction({
        scenarioId: row.id,
        sessionId: row.session_id,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Szenario gelöscht");
        setConfirmDelete(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Aktionen"
              disabled={isPending}
              data-testid={`scenarios-row-actions-${row.id}`}
              // Nicht entfernen — Radix' Outside-Click-Listener würde den
              // propagierten Klick als "außerhalb" werten und das Menu sofort
              // wieder schließen. Separat vom DataTable-Event-Target-Filter.
              onClick={(event) => event.stopPropagation()}
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" data-testid={`scenarios-row-menu-${row.id}`}>
          {canSave && (
            <DropdownMenuItem
              onClick={handleSave}
              data-testid={`scenarios-save-${row.id}`}
            >
              <SaveIcon />
              Speichern
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => setConfirmDelete(true)}
              className="text-destructive focus:text-destructive"
              data-testid={`scenarios-delete-${row.id}`}
            >
              <Trash2Icon />
              Löschen
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent data-testid={`scenarios-delete-dialog-${row.id}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Szenario löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{row.name}“ wird unwiderruflich entfernt. Diese Aktion kann nicht rückgängig
              gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`scenarios-delete-cancel-${row.id}`}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              data-testid={`scenarios-delete-confirm-${row.id}`}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
