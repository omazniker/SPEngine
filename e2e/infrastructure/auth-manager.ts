import { existsSync } from "node:fs";

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

async function authUserExists(email: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`auth.admin.listUsers fehlgeschlagen: ${error.message}`);
  const needle = email.toLowerCase();
  return data.users.some((u) => u.email?.toLowerCase() === needle);
}

/**
 * Stellt sicher, dass ein User existiert + eingeloggt ist. Wiederverwendet per
 * `getStoredTestUser` (inkl. Storage-State-Datei); erstellt neu über UI-Signup
 * + DB-E-Mail-Verifikation + UI-Login.
 *
 * Voraussetzungen:
 *   - Supabase ENV gesetzt (siehe `.env.local.example`, inkl. SUPABASE_SERVICE_ROLE_KEY)
 *   - Tabelle `profiles` mit Spalte `email_verified` existiert (siehe Migration
 *     `20260421120000_table_profiles.sql`).
 *
 * Re-Run-Verhalten: Wenn die auth.users-Zeile schon existiert (z.B. Store-Reset
 * aber DB nicht gereset), wird der Signup-Schritt übersprungen und nur via Login
 * eine neue Session erzeugt.
 */
export async function ensureUser(browser: Browser, params: EnsureUserParams): Promise<TestUser> {
  const cached = getStoredTestUser(params.email);
  if (cached?.authStatePath && existsSync(cached.authStatePath)) {
    return cached;
  }

  const needsSignup = !(await authUserExists(params.email));

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    if (needsSignup) {
      const signupPage = new SignupPage(page);
      await signupPage.goto();
      await signupPage.signup({
        email: params.email,
        password: params.password,
        company: params.company,
      });
    }

    await markEmailVerified(params.email);

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
