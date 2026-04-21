import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const STORE_PATH = resolve(process.cwd(), "e2e/.auth/test-entities.json");

export interface TestEntity {
  id: string;
  type: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

function load(): Record<string, TestEntity> {
  if (!existsSync(STORE_PATH)) return {};
  return JSON.parse(readFileSync(STORE_PATH, "utf-8")) as Record<string, TestEntity>;
}

function save(data: Record<string, TestEntity>): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

function storageKey(type: string, id: string): string {
  return `${type}:${id}`;
}

export function storeTestEntity(
  entity: Omit<TestEntity, "createdAt"> & { createdAt?: string },
): TestEntity {
  const data = load();
  const entry: TestEntity = { ...entity, createdAt: entity.createdAt ?? new Date().toISOString() };
  data[storageKey(entity.type, entity.id)] = entry;
  save(data);
  return entry;
}

export function getStoredTestEntity(type: string, id: string): TestEntity | null {
  const data = load();
  return data[storageKey(type, id)] ?? null;
}

export function getTestEntitiesByType(type: string): TestEntity[] {
  return Object.values(load()).filter((entity) => entity.type === type);
}

export function deleteTestEntity(type: string, id: string): void {
  const data = load();
  delete data[storageKey(type, id)];
  save(data);
}

export function resetTestEntities(): void {
  save({});
}
