import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const STORE_PATH = resolve(process.cwd(), "e2e/.auth/test-users.json");

export type TestUserRole = "buyer" | "supplier" | "approver" | "admin";

export interface TestUser {
  email: string;
  password: string;
  role: TestUserRole;
  orgId?: string;
  profileId?: string;
  authStatePath?: string;
  createdAt: string;
}

function load(): Record<string, TestUser> {
  if (!existsSync(STORE_PATH)) return {};
  return JSON.parse(readFileSync(STORE_PATH, "utf-8")) as Record<string, TestUser>;
}

function save(data: Record<string, TestUser>): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

export function storeTestUser(user: Omit<TestUser, "createdAt"> & { createdAt?: string }): TestUser {
  const data = load();
  const entry: TestUser = { ...user, createdAt: user.createdAt ?? new Date().toISOString() };
  data[user.email] = entry;
  save(data);
  return entry;
}

export function getStoredTestUser(email: string): TestUser | null {
  const data = load();
  return data[email] ?? null;
}

export function getAllTestUsers(): TestUser[] {
  return Object.values(load());
}

export function deleteTestUser(email: string): void {
  const data = load();
  delete data[email];
  save(data);
}

export function resetTestUsers(): void {
  save({});
}

export function authStatePathFor(email: string): string {
  const slug = email.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return resolve(process.cwd(), "e2e/.auth", `${slug}.json`);
}
