import type { ReadinessLog, ScheduledSession, Session } from '../models/types';
import { daysBetween, todayISO } from './dates';
import { parsePlanned } from '../repositories/plan';

export function totalDistanceM(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + (s.distance_m ?? 0), 0);
}

export function plannedDistanceM(scheduled: ScheduledSession[]): number {
  return scheduled.reduce((sum, s) => sum + (parsePlanned(s).distance_m ?? 0), 0);
}

/** Consecutive days (ending today or yesterday) with at least one logged session. */
export function loggingStreak(sessions: Session[], asOf = todayISO()): number {
  const dates = new Set(sessions.map((s) => s.date));
  let streak = 0;
  // Allow the streak to "hold" if today isn't logged yet but yesterday was.
  let offset = dates.has(asOf) ? 0 : 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const target = shift(asOf, -(streak + offset));
    if (dates.has(target)) streak += 1;
    else break;
  }
  return streak;
}

function shift(iso: string, days: number): string {
  // small local shifter to avoid a circular import with dates' addDaysISO usage patterns
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function longestRunM(sessions: Session[]): number {
  return sessions
    .filter((s) => s.type === 'run')
    .reduce((max, s) => Math.max(max, s.distance_m ?? 0), 0);
}

/** Fastest (lowest) pace among runs of at least minDistanceM with a recorded pace. */
export function fastestPace(sessions: Session[], minDistanceM = 3000): number | null {
  const paces = sessions
    .filter((s) => s.type === 'run' && (s.distance_m ?? 0) >= minDistanceM && s.avg_pace_s_per_km)
    .map((s) => s.avg_pace_s_per_km as number);
  return paces.length ? Math.min(...paces) : null;
}

export function averageReadiness(readiness: ReadinessLog[], field: 'sleep_quality' | 'soreness' | 'pain_severity'): number | null {
  const vals = readiness.map((r) => r[field]).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function strengthSessionCount(sessions: Session[]): number {
  return sessions.filter((s) => s.type === 'strength').length;
}

export { daysBetween };
