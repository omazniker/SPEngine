import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const STORE_PATH = resolve(process.cwd(), "e2e/.auth/journey-state.json");

type StoreValue = string | number | boolean | null | StoreValue[] | { [key: string]: StoreValue };

function load(): Record<string, StoreValue> {
  if (!existsSync(STORE_PATH)) return {};
  return JSON.parse(readFileSync(STORE_PATH, "utf-8")) as Record<string, StoreValue>;
}

function save(data: Record<string, StoreValue>): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

export function journeySet(key: string, value: StoreValue): void {
  const data = load();
  data[key] = value;
  save(data);
}

export function journeyGet<T extends StoreValue = StoreValue>(key: string): T {
  const data = load();
  if (!(key in data)) {
    throw new Error(`JourneyStore: Key "${key}" nicht gefunden. Läuft die vorherige Journey?`);
  }
  return data[key] as T;
}

export function journeyHas(key: string): boolean {
  return key in load();
}

export function journeyReset(): void {
  save({});
}
