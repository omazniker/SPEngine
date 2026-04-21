"use client";

import type * as React from "react";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * AppDialog — Standard-Wrapper für alle Dialoge (AGENTS.md §"AppDialog").
 *
 * NIEMALS den Shadcn-Standard `Dialog`/`DialogContent` direkt verwenden.
 * Layout:
 *   - AppDialogHeader / Footer bleiben fixiert
 *   - Nur AppDialogBody scrollt (overflow-y-auto)
 *   - Größen via `size`-Prop, alle auf `calc(100vw-2rem)` / `calc(100vh-2rem)` gecappt
 */

const contentVariants = cva(
  "fixed top-1/2 left-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
  {
    variants: {
      size: {
        sm: "sm:max-w-sm",
        md: "sm:max-w-md",
        lg: "sm:max-w-lg",
        xl: "sm:max-w-xl",
        "2xl": "sm:max-w-2xl",
        "3xl": "sm:max-w-3xl",
        "4xl": "sm:max-w-4xl",
        "5xl": "sm:max-w-5xl",
        "6xl": "sm:max-w-6xl",
        "7xl": "sm:max-w-7xl",
        fit: "sm:max-w-fit",
        full: "sm:max-w-[calc(100vw-2rem)]",
      },
    },
    defaultVariants: { size: "2xl" },
  },
);

function AppDialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="app-dialog" {...props} />;
}

function AppDialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="app-dialog-trigger" {...props} />;
}

function AppDialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="app-dialog-close" {...props} />;
}

type AppDialogContentProps = DialogPrimitive.Popup.Props &
  VariantProps<typeof contentVariants> & {
    showCloseButton?: boolean;
  };

function AppDialogContent({
  className,
  size,
  children,
  showCloseButton = true,
  ...props
}: AppDialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="app-dialog-overlay"
        className="fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogPrimitive.Popup
        data-slot="app-dialog-content"
        className={cn(contentVariants({ size }), className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="app-dialog-close-button"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2 z-10"
                size="icon-sm"
                aria-label="Schließen"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Schließen</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function AppDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-dialog-header"
      className={cn("flex shrink-0 flex-col gap-1 border-b px-6 py-4", className)}
      {...props}
    />
  );
}

function AppDialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-dialog-body"
      className={cn("flex-1 overflow-y-auto px-6 py-4", className)}
      {...props}
    />
  );
}

function AppDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-dialog-footer"
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function AppDialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="app-dialog-title"
      className={cn("text-base leading-none font-semibold", className)}
      {...props}
    />
  );
}

function AppDialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="app-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  AppDialog,
  AppDialogBody,
  AppDialogClose,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogTrigger,
};
