import type * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * StatusBadge — Single Source of Truth für Status-Darstellung.
 * Neue Status-Badges als Wrapper um diese Komponente (AGENTS.md §"Zentrale Utilities").
 * Farben kommen aus Tokens in `globals.css`, KEINE hardcoded Hex-Werte.
 */
const toneVariants = cva("", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground",
      info: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      error: "bg-red-500/10 text-red-700 dark:text-red-300",
      pending: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type StatusTone = NonNullable<VariantProps<typeof toneVariants>["tone"]>;

export interface StatusBadgeProps
  extends Omit<React.ComponentProps<typeof Badge>, "variant">,
    VariantProps<typeof toneVariants> {}

export function StatusBadge({ tone, className, ...props }: StatusBadgeProps) {
  return (
    <Badge
      data-slot="status-badge"
      data-tone={tone ?? "neutral"}
      className={cn(toneVariants({ tone }), className)}
      {...props}
    />
  );
}
