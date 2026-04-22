import { expect, test } from "@playwright/test";

/**
 * Smoke-Tests: prüfen, dass die statischen Routes + Session/Scenario-Lifecycle
 * grundsätzlich laufen. Erwartet eine konfigurierte Supabase-Instanz (lokal
 * via `supabase start` oder Cloud). Ohne `.env.local` würden die DB-basierten
 * Tests einen Config-Fehler statt Empty-State zeigen — dann entweder Supabase
 * starten oder die Detail-Tests skippen.
 */
test.describe("Smoke", () => {
  test("Landing Page lädt mit Stack-Übersicht", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok(), "HTTP-Status muss 2xx sein").toBeTruthy();

    await expect(page.getByTestId("landing-page")).toBeVisible();
    await expect(page.getByTestId("landing-status-badge")).toBeVisible();
    await expect(page.getByTestId("landing-login-link")).toBeVisible();
  });

  test("Login-Seite rendert Form mit data-testid-Feldern", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByTestId("login-page")).toBeVisible();
    await expect(page.getByTestId("login-email-input")).toBeVisible();
    await expect(page.getByTestId("login-password-input")).toBeVisible();
    await expect(page.getByTestId("login-submit-button")).toBeVisible();
  });

  test("Signup-Seite rendert Form mit data-testid-Feldern", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByTestId("signup-page")).toBeVisible();
    await expect(page.getByTestId("signup-email-input")).toBeVisible();
    await expect(page.getByTestId("signup-password-input")).toBeVisible();
    await expect(page.getByTestId("signup-company-input")).toBeVisible();
    await expect(page.getByTestId("signup-submit-button")).toBeVisible();
    await expect(page.getByTestId("signup-login-link")).toBeVisible();
  });

  test("Sessions-Seite rendert (Empty-State ohne Daten)", async ({ page }) => {
    await page.goto("/sessions");

    await expect(page.getByTestId("sessions-page")).toBeVisible();
    await expect(page.getByTestId("sessions-create-button")).toBeVisible();
    // Ohne Login liefert getSessionsAction RLS-gefilterte Ergebnisse — also leer.
    // Entweder Empty-State oder Error-Banner (wenn Supabase noch nicht konfiguriert).
    await expect(
      page.getByTestId("sessions-empty").or(page.getByTestId("sessions-error")),
    ).toBeVisible();
  });

  test("Sessions-Detail unbekannte ID → 404", async ({ page }) => {
    test.slow();
    const response = await page.goto("/sessions/00000000-0000-0000-0000-000000000000", {
      timeout: 300_000,
    });
    // Entweder 404 (Supabase live + notFound) oder Page mit Error (Supabase off).
    expect(response).not.toBeNull();
    if (response!.status() === 404) {
      return; // Next-404-Page ok
    }
    await expect(page.getByTestId("session-detail-page")).toBeVisible();
  });

  test("Scenario-Detail unbekannte ID → 404", async ({ page }) => {
    test.slow();
    const sid = "00000000-0000-0000-0000-000000000000";
    const scid = "00000000-0000-0000-0000-000000000001";
    const response = await page.goto(`/sessions/${sid}/scenarios/${scid}`, {
      timeout: 300_000,
    });
    expect(response).not.toBeNull();
    if (response!.status() === 404) {
      return;
    }
    await expect(page.getByTestId("scenario-detail-page")).toBeVisible();
  });
});
