import { getDb } from '../db/client';
import type { PhysiqueEntry } from '../models/types';

export type NewPhysique = Omit<PhysiqueEntry, 'id'>;

export async function listPhysique(limit = 180): Promise<PhysiqueEntry[]> {
  return getDb().getAllAsync<PhysiqueEntry>(
    'SELECT * FROM physique_entries ORDER BY date DESC, id DESC LIMIT ?',
    [limit],
  );
}

export async function createPhysique(p: NewPhysique): Promise<number> {
  const res = await getDb().runAsync(
    'INSERT INTO physique_entries (date, bodyweight, unit, photo_uri, notes) VALUES (?, ?, ?, ?, ?)',
    [p.date, p.bodyweight, p.unit, p.photo_uri, p.notes],
  );
  return res.lastInsertRowId;
}

export async function deletePhysique(id: number): Promise<void> {
  await getDb().runAsync('DELETE FROM physique_entries WHERE id = ?', [id]);
}
