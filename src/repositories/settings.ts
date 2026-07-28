import { getDb } from '../db/client';
import type { Settings } from '../models/types';

export async function getSettings(): Promise<Settings> {
  const row = await getDb().getFirstAsync<Settings>('SELECT * FROM settings WHERE id = 1');
  if (!row) throw new Error('Settings row missing — migrations did not seed it.');
  return row;
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as unknown);
  await getDb().runAsync(`UPDATE settings SET ${setClause} WHERE id = 1`, values as any[]);
}
