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

export interface RestoreResult {
  tables: number;
  rows: number;
}

/** Parse and validate a backup file's text. Throws on anything that isn't a winna backup. */
export function parseBackup(text: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file isn\'t valid JSON.');
  }
  const b = parsed as Partial<BackupFile>;
  if (!b || b.app !== 'winna' || typeof b.data !== 'object' || b.data == null) {
    throw new Error('This doesn\'t look like a winna backup.');
  }
  if (typeof b.schemaVersion === 'number' && b.schemaVersion > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `Backup is from a newer version (schema ${b.schemaVersion}). Update winna, then import.`,
    );
  }
  return b as BackupFile;
}

/**
 * Replace all local data with a backup's contents (destructive — callers confirm first).
 * Runs in one transaction: clears each known table, then re-inserts its rows generically
 * from the backup's column keys, so restores keep working across additive schema changes.
 */
export async function restoreBackup(backup: BackupFile): Promise<RestoreResult> {
  const db = getDb();
  let rowCount = 0;

  await db.withTransactionAsync(async () => {
    for (const table of TABLES) {
      await db.runAsync(`DELETE FROM ${table}`);
      const rows = (backup.data[table] as Record<string, unknown>[] | undefined) ?? [];
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map((c) => row[c] as unknown);
        await db.runAsync(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
          values as any[],
        );
        rowCount += 1;
      }
    }
    // Guarantee the singleton settings row always exists after a restore.
    await db.runAsync('INSERT OR IGNORE INTO settings (id) VALUES (1)');
  });

  return { tables: TABLES.length, rows: rowCount };
}
