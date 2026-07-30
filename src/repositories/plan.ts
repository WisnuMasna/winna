import { getDb } from '../db/client';
import type {
  PlanTemplate,
  PlannedDetails,
  ScheduledSession,
  ScheduledStatus,
  SessionType,
} from '../models/types';

// ---- Plan template ----
export type NewPlanTemplate = Omit<PlanTemplate, 'id' | 'created_at'>;

export async function listTemplates(): Promise<PlanTemplate[]> {
  return getDb().getAllAsync<PlanTemplate>('SELECT * FROM plan_templates ORDER BY race_date ASC');
}

export async function getTemplate(id: number): Promise<PlanTemplate | null> {
  return getDb().getFirstAsync<PlanTemplate>('SELECT * FROM plan_templates WHERE id = ?', [id]);
}

/** The race to focus on: the nearest upcoming race, or the most recent one if all are past. */
export async function getActiveTemplate(asOfISO?: string): Promise<PlanTemplate | null> {
  const today = asOfISO ?? new Date().toISOString().slice(0, 10);
  const upcoming = await getDb().getFirstAsync<PlanTemplate>(
    'SELECT * FROM plan_templates WHERE race_date >= ? ORDER BY race_date ASC LIMIT 1',
    [today],
  );
  if (upcoming) return upcoming;
  return getDb().getFirstAsync<PlanTemplate>(
    'SELECT * FROM plan_templates ORDER BY race_date DESC LIMIT 1',
  );
}

export async function createTemplate(t: NewPlanTemplate): Promise<number> {
  const res = await getDb().runAsync(
    `INSERT INTO plan_templates
       (name, race_distance, race_date, goal_seconds, weekly_frequency, start_date, structure_json, strength_split_json, equipment, chained_from_id, baseline_weekly_km, long_run_day, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.name,
      t.race_distance,
      t.race_date,
      t.goal_seconds,
      t.weekly_frequency,
      t.start_date,
      t.structure_json,
      t.strength_split_json,
      t.equipment,
      t.chained_from_id,
      t.baseline_weekly_km,
      t.long_run_day,
      new Date().toISOString(),
    ],
  );
  return res.lastInsertRowId;
}

export async function updateTemplate(id: number, patch: Partial<NewPlanTemplate>): Promise<void> {
  const keys = Object.keys(patch) as (keyof NewPlanTemplate)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as unknown);
  await getDb().runAsync(`UPDATE plan_templates SET ${setClause} WHERE id = ?`, [
    ...values,
    id,
  ] as any[]);
}

export async function deleteTemplate(id: number): Promise<void> {
  await getDb().runAsync('DELETE FROM scheduled_sessions WHERE template_id = ?', [id]);
  await getDb().runAsync('UPDATE plan_templates SET chained_from_id = NULL WHERE chained_from_id = ?', [id]);
  await getDb().runAsync('DELETE FROM plan_templates WHERE id = ?', [id]);
}

/** Remove generated instances for one race only (keeps other races' plans intact). */
export async function clearScheduledForTemplate(templateId: number): Promise<void> {
  await getDb().runAsync('DELETE FROM scheduled_sessions WHERE template_id = ?', [templateId]);
}

// ---- Scheduled session instances ----
export type NewScheduled = Omit<ScheduledSession, 'id'>;

export async function listScheduledBetween(
  fromISO: string,
  toISO: string,
): Promise<ScheduledSession[]> {
  return getDb().getAllAsync<ScheduledSession>(
    'SELECT * FROM scheduled_sessions WHERE date >= ? AND date <= ? ORDER BY date ASC, id ASC',
    [fromISO, toISO],
  );
}

export async function listScheduledForDate(dateISO: string): Promise<ScheduledSession[]> {
  return getDb().getAllAsync<ScheduledSession>(
    'SELECT * FROM scheduled_sessions WHERE date = ? ORDER BY id ASC',
    [dateISO],
  );
}

export async function getScheduled(id: number): Promise<ScheduledSession | null> {
  return getDb().getFirstAsync<ScheduledSession>('SELECT * FROM scheduled_sessions WHERE id = ?', [
    id,
  ]);
}

export async function insertScheduled(s: NewScheduled): Promise<number> {
  const res = await getDb().runAsync(
    `INSERT INTO scheduled_sessions
       (date, type, phase, planned_json, status, flag_reason, template_id, linked_session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.date,
      s.type,
      s.phase,
      s.planned_json,
      s.status,
      s.flag_reason,
      s.template_id,
      s.linked_session_id,
    ],
  );
  return res.lastInsertRowId;
}

export async function bulkInsertScheduled(rows: NewScheduled[]): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    for (const s of rows) {
      await db.runAsync(
        `INSERT INTO scheduled_sessions
           (date, type, phase, planned_json, status, flag_reason, template_id, linked_session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.date,
          s.type,
          s.phase,
          s.planned_json,
          s.status,
          s.flag_reason,
          s.template_id,
          s.linked_session_id,
        ],
      );
    }
  });
}

export async function updateScheduled(id: number, patch: Partial<NewScheduled>): Promise<void> {
  const keys = Object.keys(patch) as (keyof NewScheduled)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as unknown);
  await getDb().runAsync(`UPDATE scheduled_sessions SET ${setClause} WHERE id = ?`, [
    ...values,
    id,
  ] as any[]);
}

export async function setScheduledStatus(
  id: number,
  status: ScheduledStatus,
  linkedSessionId: number | null = null,
): Promise<void> {
  await getDb().runAsync(
    'UPDATE scheduled_sessions SET status = ?, linked_session_id = ? WHERE id = ?',
    [status, linkedSessionId, id],
  );
}

export async function setScheduledDate(id: number, dateISO: string): Promise<void> {
  await getDb().runAsync('UPDATE scheduled_sessions SET date = ? WHERE id = ?', [dateISO, id]);
}

export async function setScheduledType(id: number, type: SessionType): Promise<void> {
  await getDb().runAsync('UPDATE scheduled_sessions SET type = ? WHERE id = ?', [type, id]);
}

export async function deleteScheduled(id: number): Promise<void> {
  await getDb().runAsync('DELETE FROM scheduled_sessions WHERE id = ?', [id]);
}

/** Wipe all generated instances (used when regenerating a plan). Template rows are kept. */
export async function clearScheduledFrom(dateISO: string): Promise<void> {
  await getDb().runAsync('DELETE FROM scheduled_sessions WHERE date >= ?', [dateISO]);
}

// ---- planned_json helpers ----
export function parsePlanned(s: ScheduledSession): PlannedDetails {
  try {
    return JSON.parse(s.planned_json) as PlannedDetails;
  } catch {
    return {};
  }
}

export function stringifyPlanned(d: PlannedDetails): string {
  return JSON.stringify(d);
}
