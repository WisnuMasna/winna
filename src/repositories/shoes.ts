import { getDb } from '../db/client';
import type { Shoe } from '../models/types';

export type NewShoe = Omit<Shoe, 'id'>;

export interface ShoeWithMileage extends Shoe {
  total_m: number;
}

export async function listShoes(): Promise<Shoe[]> {
  return getDb().getAllAsync<Shoe>('SELECT * FROM shoes ORDER BY retired ASC, name ASC');
}

/** Shoes with their accumulated run distance (from linked sessions) in meters. */
export async function listShoesWithMileage(): Promise<ShoeWithMileage[]> {
  return getDb().getAllAsync<ShoeWithMileage>(
    `SELECT s.*, COALESCE(SUM(ses.distance_m), 0) AS total_m
       FROM shoes s
       LEFT JOIN sessions ses ON ses.shoe_id = s.id
      GROUP BY s.id
      ORDER BY s.retired ASC, s.name ASC`,
  );
}

export async function createShoe(s: NewShoe): Promise<number> {
  const res = await getDb().runAsync(
    'INSERT INTO shoes (name, purchased_date, threshold_km, retired) VALUES (?, ?, ?, ?)',
    [s.name, s.purchased_date, s.threshold_km, s.retired],
  );
  return res.lastInsertRowId;
}

export async function updateShoe(id: number, patch: Partial<NewShoe>): Promise<void> {
  const keys = Object.keys(patch) as (keyof NewShoe)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as unknown);
  await getDb().runAsync(`UPDATE shoes SET ${setClause} WHERE id = ?`, [...values, id] as any[]);
}

export async function deleteShoe(id: number): Promise<void> {
  await getDb().runAsync('UPDATE sessions SET shoe_id = NULL WHERE shoe_id = ?', [id]);
  await getDb().runAsync('DELETE FROM shoes WHERE id = ?', [id]);
}
