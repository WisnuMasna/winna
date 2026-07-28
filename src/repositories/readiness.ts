import { getDb } from '../db/client';
import type { ReadinessLog } from '../models/types';

export type NewReadiness = Omit<ReadinessLog, 'id'>;

export async function listReadiness(limit = 90): Promise<ReadinessLog[]> {
  return getDb().getAllAsync<ReadinessLog>(
    'SELECT * FROM readiness_logs ORDER BY date DESC, id DESC LIMIT ?',
    [limit],
  );
}

export async function listReadinessBetween(fromISO: string, toISO: string): Promise<ReadinessLog[]> {
  return getDb().getAllAsync<ReadinessLog>(
    'SELECT * FROM readiness_logs WHERE date >= ? AND date <= ? ORDER BY date ASC',
    [fromISO, toISO],
  );
}

export async function getReadinessForDate(dateISO: string): Promise<ReadinessLog | null> {
  return getDb().getFirstAsync<ReadinessLog>(
    'SELECT * FROM readiness_logs WHERE date = ? ORDER BY id DESC LIMIT 1',
    [dateISO],
  );
}

/** Upsert-by-date: one readiness entry per day, latest edit wins. */
export async function saveReadiness(r: NewReadiness): Promise<number> {
  const existing = await getReadinessForDate(r.date);
  if (existing) {
    await getDb().runAsync(
      `UPDATE readiness_logs
         SET sleep_quality = ?, soreness = ?, pain_location = ?, pain_severity = ?, notes = ?
       WHERE id = ?`,
      [r.sleep_quality, r.soreness, r.pain_location, r.pain_severity, r.notes, existing.id],
    );
    return existing.id;
  }
  const res = await getDb().runAsync(
    `INSERT INTO readiness_logs (date, sleep_quality, soreness, pain_location, pain_severity, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [r.date, r.sleep_quality, r.soreness, r.pain_location, r.pain_severity, r.notes],
  );
  return res.lastInsertRowId;
}

export async function deleteReadiness(id: number): Promise<void> {
  await getDb().runAsync('DELETE FROM readiness_logs WHERE id = ?', [id]);
}
