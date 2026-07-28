import { getDb } from '../db/client';
import type { InjuryLog } from '../models/types';

export type NewInjury = Omit<InjuryLog, 'id'>;

export async function listInjuries(): Promise<InjuryLog[]> {
  return getDb().getAllAsync<InjuryLog>(
    `SELECT * FROM injury_logs
     ORDER BY (status = 'active') DESC, started_date DESC`,
  );
}

export async function listActiveInjuries(): Promise<InjuryLog[]> {
  return getDb().getAllAsync<InjuryLog>(
    "SELECT * FROM injury_logs WHERE status = 'active' ORDER BY started_date DESC",
  );
}

export async function createInjury(i: NewInjury): Promise<number> {
  const res = await getDb().runAsync(
    `INSERT INTO injury_logs (location, started_date, resolved_date, severity, status, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [i.location, i.started_date, i.resolved_date, i.severity, i.status, i.notes],
  );
  return res.lastInsertRowId;
}

export async function updateInjury(id: number, patch: Partial<NewInjury>): Promise<void> {
  const keys = Object.keys(patch) as (keyof NewInjury)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as unknown);
  await getDb().runAsync(`UPDATE injury_logs SET ${setClause} WHERE id = ?`, [
    ...values,
    id,
  ] as any[]);
}

export async function resolveInjury(id: number, resolvedDateISO: string): Promise<void> {
  await getDb().runAsync(
    "UPDATE injury_logs SET status = 'resolved', resolved_date = ? WHERE id = ?",
    [resolvedDateISO, id],
  );
}

export async function deleteInjury(id: number): Promise<void> {
  await getDb().runAsync('DELETE FROM injury_logs WHERE id = ?', [id]);
}
