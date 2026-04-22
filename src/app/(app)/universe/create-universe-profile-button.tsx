"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PlusIcon } from "lucide-react";

import { GenericForm, GenericFormSubmit } from "@/components/form/generic-form";
import {
  AppDialog,
  AppDialogBody,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogTrigger,
} from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createUniverseProfileAction,
  createUniverseProfileSchema,
} from "@/features/universe";

export function CreateUniverseProfileButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <AppDialog open={open} onOpenChange={setOpen}>
      <AppDialogTrigger
        render={
          <Button variant="default" data-testid="universe-create-button">
            <PlusIcon />
            Neues Universum
          </Button>
        }
      />
      <AppDialogContent size="md" data-testid="universe-create-dialog">
        <AppDialogHeader>
          <AppDialogTitle>Neues Universum</AppDialogTitle>
          <AppDialogDescription>
            Name vergeben. Bond-Import via XLSX folgt in einer späteren Version — das Universum
            wird hier als leerer Snapshot angelegt.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody>
          <GenericForm
            id="universe-create-form"
            testId="universe-create-form"
            schema={createUniverseProfileSchema}
            successToast="Universum erstellt"
            action={async (data) => {
              const result = await createUniverseProfileAction(data);
              if ("error" in result) return { error: result.error };
              return { data: result.data };
            }}
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="universe-name">Name</Label>
              <Input
                id="universe-name"
                name="name"
                type="text"
                required
                autoFocus
                data-testid="universe-create-name-input"
              />
            </div>
          </GenericForm>
        </AppDialogBody>
        <AppDialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="universe-create-cancel"
          >
            Abbrechen
          </Button>
          <GenericFormSubmit
            form="universe-create-form"
            data-testid="universe-create-submit"
          >
            Erstellen
          </GenericFormSubmit>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
