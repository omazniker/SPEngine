"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Trash2Icon } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteUniverseProfileAction } from "@/features/universe";

export function DeleteUniverseButton({
  universeProfileId,
  universeName,
}: {
  universeProfileId: string;
  universeName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteUniverseProfileAction({ universeProfileId });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Universum gelöscht");
      setOpen(false);
      router.push("/universe");
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" data-testid="universe-detail-delete-button">
            <Trash2Icon />
            Löschen
          </Button>
        }
      />
      <AlertDialogContent data-testid="universe-detail-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Universum löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            „{universeName}“ wird unwiderruflich entfernt. Sessions, die dieses Universum
            nutzen, verlieren nur die Verknüpfung — sie bleiben bestehen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="universe-detail-delete-cancel">
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            data-testid="universe-detail-delete-confirm"
          >
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
