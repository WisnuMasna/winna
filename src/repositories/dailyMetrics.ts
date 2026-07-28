import { getDb } from '../db/client';
import type { DailyMetrics } from '../models/types';

// Storage for daily device metrics. A Garmin sync upserts one row per day; Training Readiness
// reads the most recent row. Empty until a device is connected.

export async function getMetricsForDate(dateISO: string): Promise<DailyMetrics | null> {
  return getDb().getFirstAsync<DailyMetrics>('SELECT * FROM daily_metrics WHERE date = ?', [dateISO]);
}

export async function getLatestMetrics(): Promise<DailyMetrics | null> {
  return getDb().getFirstAsync<DailyMetrics>('SELECT * FROM daily_metrics ORDER BY date DESC LIMIT 1');
}

export async function upsertMetrics(m: DailyMetrics): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO daily_metrics
       (date, source, sleep_score, hrv_status, hrv_ms, recovery_hours, resting_hr, stress, body_battery, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       source = excluded.source,
       sleep_score = excluded.sleep_score,
       hrv_status = excluded.hrv_status,
       hrv_ms = excluded.hrv_ms,
       recovery_hours = excluded.recovery_hours,
       resting_hr = excluded.resting_hr,
       stress = excluded.stress,
       body_battery = excluded.body_battery,
       updated_at = excluded.updated_at`,
    [
      m.date,
      m.source,
      m.sleep_score,
      m.hrv_status,
      m.hrv_ms,
      m.recovery_hours,
      m.resting_hr,
      m.stress,
      m.body_battery,
      m.updated_at ?? new Date().toISOString(),
    ],
  );
}
