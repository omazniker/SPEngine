import { expect, test } from "@playwright/test";

/**
 * Smoke-Tests: prüfen, dass Landing + Login-Seite grundsätzlich laufen.
 * Werden bei jedem CI-Lauf vor den Journeys ausgeführt.
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

  test("Sessions-Seite rendert (ohne Supabase zeigt sie Config-Fehler)", async ({ page }) => {
    await page.goto("/sessions");

    await expect(page.getByTestId("sessions-page")).toBeVisible();
    await expect(page.getByTestId("sessions-create-button")).toBeVisible();
    // Ohne NEXT_PUBLIC_SUPABASE_URL rendert die Action einen Fehler — das ist der
    // Happy-Path für Smoke-Tests ohne Supabase-Projekt.
    await expect(page.getByTestId("sessions-error")).toBeVisible();
  });

  test("Sessions-Detail rendert (Double-Error-State ohne Supabase)", async ({ page }) => {
    // Dynamische Routes ([id]) brauchen in `next dev` beim ersten Zugriff sehr
    // lange zum Compilen. In Production (`next build`) ist das <1s. Deshalb hier
    // `test.slow()` + expliziter goto-Timeout. Prod-Lane ist via `test:e2e:prod`.
    test.slow();
    await page.goto("/sessions/00000000-0000-0000-0000-000000000000", { timeout: 300_000 });

    await expect(page.getByTestId("session-detail-page")).toBeVisible();
    await expect(page.getByTestId("session-detail-back")).toBeVisible();
    await expect(page.getByTestId("session-detail-error")).toBeVisible();
  });

  test("Scenario-Detail rendert (Error-State ohne Supabase)", async ({ page }) => {
    test.slow();
    const sid = "00000000-0000-0000-0000-000000000000";
    const scid = "00000000-0000-0000-0000-000000000001";
    await page.goto(`/sessions/${sid}/scenarios/${scid}`, { timeout: 300_000 });

    await expect(page.getByTestId("scenario-detail-page")).toBeVisible();
    await expect(page.getByTestId("scenario-detail-back")).toBeVisible();
    await expect(page.getByTestId("scenario-detail-error")).toBeVisible();
  });
});
