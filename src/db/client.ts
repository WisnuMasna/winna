import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

// Single cached connection. initDatabase() is idempotent and runs migrations once;
// getDb() is the synchronous accessor used by repositories after init.

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (!initPromise) {
    initPromise = (async () => {
      const opened = await SQLite.openDatabaseAsync('winna.db');
      await opened.execAsync('PRAGMA journal_mode = WAL;');
      await runMigrations(opened);
      db = opened;
      return opened;
    })();
  }
  return initPromise;
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized — call initDatabase() at app startup first.');
  }
  return db;
}

export function isDatabaseReady(): boolean {
  return db !== null;
}
