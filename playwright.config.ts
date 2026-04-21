import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright-Config gemäß `CLAUDE-TEST.md`.
 *
 * Modi (via `PLAYWRIGHT_USE_PROD_BUILD=1`):
 *   - **dev** (default): `next dev` auf Port 3000. Schnelles Feedback,
 *     aber dynamische Routes `[id]` brauchen beim ersten Zugriff mehrere Minuten
 *     zum Kompilieren. Smoke-Tests setzen dort `test.slow()`.
 *   - **prod**: `next build && next start -p 3001`. Langer Build vorab,
 *     dann alle Routes <1s pro Request — stabil für CI und dynamische Routes.
 *
 * - `workers: 1` + `fullyParallel: false` — Journeys sind sequentiell abhängig.
 * - `dependencies` auf Project-Ebene steuern die Journey-Reihenfolge.
 */
const USE_PROD = process.env.PLAYWRIGHT_USE_PROD_BUILD === "1";
const PROD_PORT = 3001;
const DEV_PORT = 3000;
const DEFAULT_URL = USE_PROD ? `http://localhost:${PROD_PORT}` : `http://localhost:${DEV_PORT}`;

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  // 180s: in next dev triggert der erste Zugriff je Route eine On-Demand-Compilation.
  // In Prod-Modus könnte timeout auf 30s runter, bleibt aber konservativ.
  timeout: 180_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    },
  },
  webServer: USE_PROD
    ? {
        command: `npm run build && npm run start -- -p ${PROD_PORT}`,
        url: `http://localhost:${PROD_PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      }
    : {
        command: "npm run dev",
        url: `http://localhost:${DEV_PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "smoke",
      testMatch: /00-smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Weitere Journeys werden hier ergänzt, sobald SPEngine-Next-Domäne steht.
  ],
});
