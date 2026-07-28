import type { PlannedDetails, ReadinessLog, ScheduledSession, Session } from '../models/types';
import { addDaysISO, daysBetween, todayISO } from './dates';

// Rule-based, reactive adjustment flags. Each is surfaced as a *dismissible* banner —
// never a gate. Simple rules per spec; the LLM layer is a later phase.

export type FlagSeverity = 'info' | 'warn' | 'danger';

export interface Flag {
  id: string;
  severity: FlagSeverity;
  title: string;
  message: string;
  suggestion?: string;
}

/** pain_severity >= 3 for 2+ consecutive most-recent days → suggest rest / cross-training. */
export function painStreakFlag(readiness: ReadinessLog[]): Flag | null {
  const byDateDesc = [...readiness].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let cursor: string | null = null;
  for (const r of byDateDesc) {
    if ((r.pain_severity ?? 0) < 3) break;
    if (cursor === null) {
      cursor = r.date;
      streak = 1;
    } else if (daysBetween(r.date, cursor) === 1) {
      cursor = r.date;
      streak += 1;
    } else {
      break;
    }
  }
  if (streak >= 2) {
    const loc = byDateDesc.find((r) => r.pain_location)?.pain_location;
    return {
      id: 'pain-streak',
      severity: 'danger',
      title: `Pain flagged ${streak} days running`,
      message: `You've logged pain ≥3${loc ? ` (${loc})` : ''} for ${streak} consecutive days.`,
      suggestion: 'Consider swapping the next hard session for rest or easy cross-training.',
    };
  }
  return null;
}

/** A long run and a heavy leg day scheduled within 24h → flag for reshuffling. */
export function longRunLegDayClashFlags(scheduled: ScheduledSession[]): Flag[] {
  const flags: Flag[] = [];
  const parse = (s: ScheduledSession): PlannedDetails => {
    try {
      return JSON.parse(s.planned_json) as PlannedDetails;
    } catch {
      return {};
    }
  };
  const longRuns = scheduled.filter((s) => s.type === 'run' && parse(s).workout_kind === 'long');
  const legDays = scheduled.filter((s) => s.type === 'strength' && parse(s).split === 'lower');

  for (const lr of longRuns) {
    for (const leg of legDays) {
      const gap = Math.abs(daysBetween(lr.date, leg.date));
      if (gap <= 1) {
        flags.push({
          id: `clash-${lr.id}-${leg.id}`,
          severity: 'warn',
          title: 'Long run next to a leg day',
          message: `Long run (${lr.date}) and lower-body lift (${leg.date}) are within 24h.`,
          suggestion: 'Reshuffle the week to give your legs a buffer.',
        });
      }
    }
  }
  return flags;
}

/**
 * Acute:Chronic Workload Ratio. Acute = last 7 days load; chronic = average weekly load
 * over the last 28 days. Load = distance (m), or duration (s/10) when distance is absent.
 * Ratio > 1.5 is commonly cited as a spike worth flagging.
 */
export function computeACWR(sessions: Session[], asOfISO = todayISO()): number | null {
  const load = (s: Session): number => s.distance_m ?? (s.duration_s != null ? s.duration_s / 10 : 0);
  const start28 = addDaysISO(asOfISO, -27);
  const start7 = addDaysISO(asOfISO, -6);

  let acute = 0;
  let chronic = 0;
  let has28 = false;
  for (const s of sessions) {
    if (s.date < start28 || s.date > asOfISO) continue;
    has28 = true;
    chronic += load(s);
    if (s.date >= start7) acute += load(s);
  }
  if (!has28 || chronic === 0) return null;
  const chronicWeekly = chronic / 4; // 28 days ≈ 4 weeks
  if (chronicWeekly === 0) return null;
  return acute / chronicWeekly;
}

export function acwrFlag(sessions: Session[], asOfISO = todayISO()): Flag | null {
  const ratio = computeACWR(sessions, asOfISO);
  if (ratio == null) return null;
  if (ratio > 1.5) {
    return {
      id: 'acwr-high',
      severity: 'danger',
      title: `Training load spike (ACWR ${ratio.toFixed(2)})`,
      message: 'Your last 7 days are well above your 4-week average — a known injury-risk window.',
      suggestion: 'Ease off volume or intensity for a few days.',
    };
  }
  if (ratio < 0.8) {
    return {
      id: 'acwr-low',
      severity: 'info',
      title: `Training load dip (ACWR ${ratio.toFixed(2)})`,
      message: 'Your recent load is below your baseline — fine during taper or recovery weeks.',
    };
  }
  return null;
}

/** HR/pace zones drift as fitness changes — nudge a recalibration every ~5 weeks. */
export function hrZoneReminderFlag(lastUpdatedISO: string | null, asOfISO = todayISO()): Flag | null {
  if (!lastUpdatedISO) {
    return {
      id: 'hr-zone-init',
      severity: 'info',
      title: 'Set your training zones',
      message: 'Calibrate HR/pace zones once so "easy" and "threshold" targets stay accurate.',
    };
  }
  const days = daysBetween(lastUpdatedISO, asOfISO);
  if (days >= 35) {
    return {
      id: 'hr-zone-stale',
      severity: 'info',
      title: 'Time to reassess your zones',
      message: `It's been ${Math.floor(days / 7)} weeks since your last zone check.`,
      suggestion: 'Re-test after a recent race or time trial.',
    };
  }
  return null;
}

/** Collect all active flags for the dashboard / Today screen. */
export function collectFlags(input: {
  readiness: ReadinessLog[];
  scheduledThisWeek: ScheduledSession[];
  recentSessions: Session[];
  hrZoneUpdatedAt: string | null;
}): Flag[] {
  const flags: Flag[] = [];
  const pain = painStreakFlag(input.readiness);
  if (pain) flags.push(pain);
  flags.push(...longRunLegDayClashFlags(input.scheduledThisWeek));
  const acwr = acwrFlag(input.recentSessions);
  if (acwr) flags.push(acwr);
  const hr = hrZoneReminderFlag(input.hrZoneUpdatedAt);
  if (hr) flags.push(hr);
  // Danger first.
  const rank: Record<FlagSeverity, number> = { danger: 0, warn: 1, info: 2 };
  return flags.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
