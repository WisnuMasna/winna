import { getDb } from '../db/client';
import type { Session, StrengthExercise, StrengthSession } from '../models/types';

export type NewSession = Omit<Session, 'id'>;

export async function listSessions(limit = 200): Promise<Session[]> {
  return getDb().getAllAsync<Session>(
    'SELECT * FROM sessions ORDER BY date DESC, id DESC LIMIT ?',
    [limit],
  );
}

export async function listSessionsBetween(fromISO: string, toISO: string): Promise<Session[]> {
  return getDb().getAllAsync<Session>(
    'SELECT * FROM sessions WHERE date >= ? AND date <= ? ORDER BY date ASC, id ASC',
    [fromISO, toISO],
  );
}

export async function getSession(id: number): Promise<Session | null> {
  return getDb().getFirstAsync<Session>('SELECT * FROM sessions WHERE id = ?', [id]);
}

export async function createSession(s: NewSession): Promise<number> {
  const res = await getDb().runAsync(
    `INSERT INTO sessions
       (date, type, source, duration_s, distance_m, avg_pace_s_per_km, avg_hr, rpe, notes, shoe_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.date,
      s.type,
      s.source,
      s.duration_s,
      s.distance_m,
      s.avg_pace_s_per_km,
      s.avg_hr,
      s.rpe,
      s.notes,
      s.shoe_id,
    ],
  );
  return res.lastInsertRowId;
}

export async function updateSession(id: number, patch: Partial<NewSession>): Promise<void> {
  const keys = Object.keys(patch) as (keyof NewSession)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as unknown);
  await getDb().runAsync(`UPDATE sessions SET ${setClause} WHERE id = ?`, [...values, id] as any[]);
}

export async function deleteSession(id: number): Promise<void> {
  await getDb().runAsync('DELETE FROM strength_sessions WHERE session_id = ?', [id]);
  await getDb().runAsync('DELETE FROM sessions WHERE id = ?', [id]);
}

// ---- Strength detail linked to a session ----
export async function getStrengthForSession(sessionId: number): Promise<StrengthExercise[]> {
  const row = await getDb().getFirstAsync<StrengthSession>(
    'SELECT * FROM strength_sessions WHERE session_id = ?',
    [sessionId],
  );
  if (!row) return [];
  try {
    return JSON.parse(row.exercises_json) as StrengthExercise[];
  } catch {
    return [];
  }
}

export async function setStrengthForSession(
  sessionId: number,
  exercises: StrengthExercise[],
): Promise<void> {
  const json = JSON.stringify(exercises);
  const existing = await getDb().getFirstAsync<StrengthSession>(
    'SELECT id FROM strength_sessions WHERE session_id = ?',
    [sessionId],
  );
  if (existing) {
    await getDb().runAsync('UPDATE strength_sessions SET exercises_json = ? WHERE session_id = ?', [
      json,
      sessionId,
    ]);
  } else {
    await getDb().runAsync(
      'INSERT INTO strength_sessions (session_id, exercises_json) VALUES (?, ?)',
      [sessionId, json],
    );
  }
}
