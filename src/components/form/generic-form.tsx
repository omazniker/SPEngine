"use client";

import { type FormEvent, type ReactNode, useState, useTransition } from "react";

import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * GenericForm — Pflicht-Wrapper für alle Mutationen (AGENTS.md §"UI Patterns").
 *
 * Hält Zod-Validierung, Server-Action-Aufruf, Fehler-Handling und Toast-Feedback
 * an EINER Stelle, damit Features nicht jedes Mal eigene Form-Boilerplates schreiben.
 *
 * **Status:** Minimalversion. Wenn react-hook-form benötigt wird (komplexe Felder,
 * Field-Arrays), später auf `react-hook-form` + `@hookform/resolvers/zod` heben.
 *
 * ## Beispiel
 * ```tsx
 * const schema = z.object({ name: z.string().min(1) })
 *
 * <GenericForm
 *   schema={schema}
 *   action={async (data) => { ... return { data: ... } }}
 *   onSuccess={(result) => router.push(`/items/${result.id}`)}
 *   testId="item-create-form"
 * >
 *   <Input name="name" />
 *   <GenericFormSubmit>Speichern</GenericFormSubmit>
 * </GenericForm>
 * ```
 */

export type ActionResult<T> = { data: T; error?: never } | { data?: never; error: string };

export interface GenericFormProps<TSchema extends z.ZodTypeAny> {
  schema: TSchema;
  action: (input: z.output<TSchema>) => Promise<ActionResult<unknown>>;
  onSuccess?: (result: unknown) => void;
  onError?: (error: string) => void;
  testId: string;
  /** HTML id auf dem `<form>`. Erlaubt externe Submit-Buttons via `form="<id>"`. */
  id?: string;
  successToast?: string;
  className?: string;
  children: ReactNode;
}

export function GenericForm<TSchema extends z.ZodTypeAny>({
  schema,
  action,
  onSuccess,
  onError,
  testId,
  id,
  successToast,
  className,
  children,
}: GenericFormProps<TSchema>) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.safeParse(raw);

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const message = first ? `${first.path.join(".")}: ${first.message}` : "Eingabe ungültig";
      setFormError(message);
      onError?.(message);
      return;
    }

    startTransition(async () => {
      const result = await action(parsed.data);
      if ("error" in result && result.error) {
        setFormError(result.error);
        onError?.(result.error);
        toast.error(result.error);
        return;
      }
      if (successToast) toast.success(successToast);
      onSuccess?.(result.data);
    });
  }

  return (
    <form
      id={id}
      data-testid={testId}
      onSubmit={onSubmit}
      className={cn("flex flex-col gap-4", className)}
      noValidate
    >
      <fieldset disabled={isPending} className="contents">
        {children}
      </fieldset>
      {formError && (
        <p role="alert" data-testid={`${testId}-error`} className="text-sm text-destructive">
          {formError}
        </p>
      )}
    </form>
  );
}

export interface GenericFormSubmitProps extends React.ComponentProps<typeof Button> {
  children?: ReactNode;
}

export function GenericFormSubmit({ children = "Speichern", ...props }: GenericFormSubmitProps) {
  return (
    <Button type="submit" {...props}>
      {children}
    </Button>
  );
}
