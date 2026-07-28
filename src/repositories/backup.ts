import { getDb } from '../db/client';
import { LATEST_SCHEMA_VERSION } from '../db/migrations';

// Full local export/backup so training history survives a phone switch or reinstall.
// Exports every table as JSON. Import replaces current data (destructive) — callers confirm first.

const TABLES = [
  'settings',
  'plan_templates',
  'scheduled_sessions',
  'sessions',
  'strength_sessions',
  'readiness_logs',
  'injury_logs',
  'shoes',
  'physique_entries',
] as const;

export interface BackupFile {
  app: 'winna';
  schemaVersion: number;
  exportedAt: string;
  data: Record<string, unknown[]>;
}

export async function buildBackup(): Promise<BackupFile> {
  const db = getDb();
  const data: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    data[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
  }
  return {
    app: 'winna',
    schemaVersion: LATEST_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export async function serializeBackup(): Promise<string> {
  return JSON.stringify(await buildBackup(), null, 2);
}
