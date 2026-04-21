import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export default function Home() {
  return (
    <main
      data-testid="landing-page"
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16"
    >
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">SPEngine Next</h1>
          <StatusBadge tone="info" data-testid="landing-status-badge">
            Test-Alternative
          </StatusBadge>
        </div>
        <p className="max-w-2xl text-base text-muted-foreground">
          Paralleler Next.js-16-Aufbau zur Produktions-SPEngine. Architektur-Regeln in{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AGENTS.md</code>, E2E in{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">CLAUDE-TEST.md</code>.
        </p>
      </header>

      <section className="flex flex-col gap-4" data-testid="landing-stack-list">
        <h2 className="text-lg font-semibold">Stack (installiert)</h2>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-md border px-3 py-2">Next.js 16 · App Router</li>
          <li className="rounded-md border px-3 py-2">React 19.2 · TypeScript 5</li>
          <li className="rounded-md border px-3 py-2">Tailwind CSS 4</li>
          <li className="rounded-md border px-3 py-2">Supabase (ssr + js)</li>
          <li className="rounded-md border px-3 py-2">shadcn/ui · base-ui</li>
          <li className="rounded-md border px-3 py-2">React Query 5</li>
          <li className="rounded-md border px-3 py-2">Zustand 5</li>
          <li className="rounded-md border px-3 py-2">Zod 4</li>
          <li className="rounded-md border px-3 py-2">Playwright</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Nächste Schritte</h2>
        <ol className="flex list-inside list-decimal flex-col gap-1 text-sm text-muted-foreground">
          <li>Supabase-Projekt anbinden (`.env.local` setzen, `npm run gen:types`)</li>
          <li>Domänen-Entities aus `/opt/spengine/` ableiten (AGENTS.md Entity-Tabelle)</li>
          <li>Journeys 01+02 von Skelett zu vollem UI-Flow ausbauen</li>
        </ol>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="default"
            nativeButton={false}
            render={
              <Link href="/login" data-testid="landing-login-link">
                Anmelden
              </Link>
            }
          />
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a href="https://github.com/omazniker/SPEngine" target="_blank" rel="noreferrer">
                SPEngine auf GitHub
              </a>
            }
          />
        </div>
      </section>
    </main>
  );
}
