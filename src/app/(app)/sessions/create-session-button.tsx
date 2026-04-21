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
import { createSessionAction, createSessionSchema } from "@/features/sessions";

export function CreateSessionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <AppDialog open={open} onOpenChange={setOpen}>
      <AppDialogTrigger
        render={
          <Button variant="default" data-testid="sessions-create-button">
            <PlusIcon />
            Neue Session
          </Button>
        }
      />
      <AppDialogContent size="md" data-testid="sessions-create-dialog">
        <AppDialogHeader>
          <AppDialogTitle>Neue Session</AppDialogTitle>
          <AppDialogDescription>
            Name vergeben. Portfolio, Constraints und Szenarien werden in der Session danach
            zusammengestellt.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody>
          <GenericForm
            id="session-create-form"
            testId="session-create-form"
            schema={createSessionSchema}
            successToast="Session erstellt"
            action={async (data) => {
              const result = await createSessionAction(data);
              if ("error" in result) return { error: result.error };
              return { data: result.data };
            }}
            onSuccess={(result) => {
              setOpen(false);
              router.refresh();
              const res = result as { sessionId: string };
              router.push(`/sessions/${res.sessionId}`);
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="session-name">Name</Label>
              <Input
                id="session-name"
                name="name"
                type="text"
                required
                autoFocus
                data-testid="session-create-name-input"
              />
            </div>
          </GenericForm>
        </AppDialogBody>
        <AppDialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="session-create-cancel"
          >
            Abbrechen
          </Button>
          <GenericFormSubmit
            form="session-create-form"
            data-testid="session-create-submit"
          >
            Erstellen
          </GenericFormSubmit>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
