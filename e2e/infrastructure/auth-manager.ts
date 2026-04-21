import type { Browser } from "@playwright/test";

import { LoginPage } from "../page-objects/login.page";
import { SignupPage } from "../page-objects/signup.page";
import { getSupabaseAdmin } from "../utils/db-helpers";
import { markEmailVerified } from "./journey-helpers";
import {
  authStatePathFor,
  getStoredTestUser,
  storeTestUser,
  type TestUser,
  type TestUserRole,
} from "./test-user-store";

export interface EnsureUserParams {
  email: string;
  password: string;
  role: TestUserRole;
  company?: string;
}

/**
 * Öffnet einen Playwright-Context mit dem persistierten Auth-State eines Users.
 */
export async function newAuthenticatedContext(browser: Browser, user: TestUser) {
  const storageState = user.authStatePath ?? authStatePathFor(user.email);
  return browser.newContext({ storageState });
}

/**
 * Stellt sicher, dass ein User existiert + eingeloggt ist. Wiederverwendet per
 * `getStoredTestUser`; erstellt neu über UI-Signup + DB-E-Mail-Verifikation + UI-Login.
 *
 * Voraussetzungen:
 *   - Supabase ENV gesetzt (siehe `.env.local.example`, inkl. SUPABASE_SERVICE_ROLE_KEY)
 *   - Tabelle `profiles` mit Spalte `email_verified` existiert (siehe `markEmailVerified`)
 *
 * Für Tests OHNE Supabase — z.B. reine Smoke-Runs — den User nur im Store ablegen
 * (siehe `getOrCreateBuyer` in `ui-finders.ts`).
 */
export async function ensureUser(browser: Browser, params: EnsureUserParams): Promise<TestUser> {
  const cached = getStoredTestUser(params.email);
  if (cached?.authStatePath) return cached;

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    await signupPage.signup({
      email: params.email,
      password: params.password,
      company: params.company,
    });

    await markEmailVerified(params.email);

    // Wenn Signup direkt einlogged (Session vorhanden), ist der Context bereits
    // authenticated. Zur Sicherheit nochmal explizit einloggen.
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(params.email, params.password);

    const storagePath = authStatePathFor(params.email);
    await context.storageState({ path: storagePath });

    const db = getSupabaseAdmin();
    const { data: profile } = await db
      .from("profiles")
      .select("id")
      .eq("email", params.email)
      .maybeSingle();

    return storeTestUser({
      email: params.email,
      password: params.password,
      role: params.role,
      profileId: profile?.id,
      authStatePath: storagePath,
    });
  } finally {
    await context.close();
  }
}
