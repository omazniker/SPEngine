"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { PlusIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

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
  parseUniverseXlsx,
  uploadUniverseProfileAction,
} from "@/features/universe";

type ParsedFile = {
  fileName: string;
  bonds: Array<Record<string, unknown>>;
};

export function CreateUniverseProfileButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setName("");
    setParsed(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleFile(file: File) {
    setParseError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bonds = await parseUniverseXlsx(buffer);
      setParsed({ fileName: file.name, bonds });
      // Namensvorschlag: Dateiname ohne Extension.
      if (!name) {
        const stem = file.name.replace(/\.[^.]+$/, "");
        setName(stem);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Parsen";
      setParseError(message);
      setParsed(null);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Name darf nicht leer sein");
      return;
    }
    startTransition(async () => {
      const result = parsed
        ? await uploadUniverseProfileAction({
            name: name.trim(),
            sourceFile: parsed.fileName,
            bondsJson: JSON.stringify(parsed.bonds),
          })
        : await createUniverseProfileAction({ name: name.trim() });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Universum erstellt");
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <AppDialog open={open} onOpenChange={handleOpenChange}>
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
            XLSX-Datei hochladen (erste Sheet-Seite wird geparst) oder leeren Snapshot anlegen.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="universe-file">XLSX-Datei (optional)</Label>
              <input
                ref={fileInputRef}
                id="universe-file"
                type="file"
                accept=".xlsx"
                data-testid="universe-create-file-input"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
                className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
              />
              {parsed && (
                <p
                  className="text-xs text-muted-foreground tabular-nums"
                  data-testid="universe-create-parse-preview"
                >
                  <UploadIcon className="mr-1 inline size-3" />
                  {parsed.fileName} — {parsed.bonds.length}{" "}
                  {parsed.bonds.length === 1 ? "Bond" : "Bonds"}
                </p>
              )}
              {parseError && (
                <p
                  className="text-xs text-destructive"
                  data-testid="universe-create-parse-error"
                >
                  {parseError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="universe-name">Name</Label>
              <Input
                id="universe-name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                data-testid="universe-create-name-input"
              />
            </div>
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            data-testid="universe-create-cancel"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            data-testid="universe-create-submit"
          >
            Erstellen
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
