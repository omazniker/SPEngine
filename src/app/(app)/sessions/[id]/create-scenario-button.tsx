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
import { createScenarioAction, createScenarioSchema } from "@/features/scenarios";

export function CreateScenarioButton({
  sessionId,
  disabled,
}: {
  sessionId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <AppDialog open={open} onOpenChange={setOpen}>
      <AppDialogTrigger
        render={
          <Button variant="default" disabled={disabled} data-testid="scenarios-create-button">
            <PlusIcon />
            Neues Szenario
          </Button>
        }
      />
      <AppDialogContent size="md" data-testid="scenarios-create-dialog">
        <AppDialogHeader>
          <AppDialogTitle>Neues Szenario</AppDialogTitle>
          <AppDialogDescription>
            Name vergeben. Optimizer-Konfiguration wird im nächsten Schritt bearbeitet.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody>
          <GenericForm
            id="scenario-create-form"
            testId="scenario-create-form"
            schema={createScenarioSchema}
            successToast="Szenario erstellt"
            action={async (data) => {
              const result = await createScenarioAction(data);
              if ("error" in result) return { error: result.error };
              return { data: result.data };
            }}
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
          >
            <input type="hidden" name="sessionId" value={sessionId} readOnly />
            <div className="flex flex-col gap-2">
              <Label htmlFor="scenario-name">Name</Label>
              <Input
                id="scenario-name"
                name="name"
                type="text"
                required
                autoFocus
                data-testid="scenario-create-name-input"
              />
            </div>
          </GenericForm>
        </AppDialogBody>
        <AppDialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="scenario-create-cancel"
          >
            Abbrechen
          </Button>
          <GenericFormSubmit form="scenario-create-form" data-testid="scenario-create-submit">
            Erstellen
          </GenericFormSubmit>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
