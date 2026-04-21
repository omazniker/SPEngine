"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ArchiveIcon, MoreHorizontalIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
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
  archiveSessionAction,
  deleteSessionAction,
  hasSessionCapability,
  restoreSessionAction,
  type SessionListItem,
} from "@/features/sessions";

export function SessionRowActions({ row }: { row: SessionListItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canArchive = hasSessionCapability(row.status, "archive");
  const canRestore = hasSessionCapability(row.status, "restore");
  const canDelete = hasSessionCapability(row.status, "delete");

  const handleArchive = () => {
    startTransition(async () => {
      const r = await archiveSessionAction({ sessionId: row.id });
      if ("error" in r) toast.error(r.error);
      else {
        toast.success("Session archiviert");
        router.refresh();
      }
    });
  };

  const handleRestore = () => {
    startTransition(async () => {
      const r = await restoreSessionAction({ sessionId: row.id });
      if ("error" in r) toast.error(r.error);
      else {
        toast.success("Session wiederhergestellt");
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const r = await deleteSessionAction({ sessionId: row.id });
      if ("error" in r) toast.error(r.error);
      else {
        toast.success("Session gelöscht");
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
              data-testid={`sessions-row-actions-${row.id}`}
              onClick={(event) => event.stopPropagation()}
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" data-testid={`sessions-row-menu-${row.id}`}>
          {canArchive && (
            <DropdownMenuItem onClick={handleArchive} data-testid={`sessions-archive-${row.id}`}>
              <ArchiveIcon />
              Archivieren
            </DropdownMenuItem>
          )}
          {canRestore && (
            <DropdownMenuItem onClick={handleRestore} data-testid={`sessions-restore-${row.id}`}>
              <RotateCcwIcon />
              Wiederherstellen
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => setConfirmDelete(true)}
              className="text-destructive focus:text-destructive"
              data-testid={`sessions-delete-${row.id}`}
            >
              <Trash2Icon />
              Löschen
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent data-testid={`sessions-delete-dialog-${row.id}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Session löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{row.name}“ wird mit allen Szenarien unwiderruflich entfernt. Diese Aktion kann
              nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`sessions-delete-cancel-${row.id}`}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              data-testid={`sessions-delete-confirm-${row.id}`}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
