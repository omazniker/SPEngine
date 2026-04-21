"use client";

import { type PropsWithChildren, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";

/**
 * Client-seitige Provider-Stack für die ganze App:
 * - React Query (Server-Cache)
 * - next-themes (Dark/Light-Mode via `class`)
 * - sonner Toaster (`data-testid="toast"` für E2E-Selektoren, siehe BasePage.expectToast)
 */
export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster data-testid="toast" richColors closeButton position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
