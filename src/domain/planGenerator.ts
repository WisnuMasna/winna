import type {
  Phase,
  PlanStructure,
  RaceDistance,
  ScheduledSession,
  SessionType,
  StrengthSplit,
  WorkoutKind,
} from '../models/types';
import { addDaysISO, daysBetween, weekdayIndex, weeksBetween } from './dates';
import { RACE_DISTANCE_METERS, trainingPaces, TrainingPaces } from './pace';
import { qualityKindForPhase, runWorkout } from './suggestions';
import { formatHrRange, hrRangeForKind } from './hr';

type NewScheduled = Omit<ScheduledSession, 'id'>;
type Role = 'long' | 'quality' | 'easy' | 'lower' | 'upper' | 'cross' | 'rest';

export interface PlanConfig {
  raceDistance: RaceDistance;
  raceDate: string; // ISO
  goalSeconds: number | null;
  weeklyFrequency: number;
  startDate: string; // ISO
  baselineWeeklyKm: number | null;
  split: StrengthSplit;
  templateId: number | null;
  distanceUnit: 'km' | 'mi';
  maxHr: number | null; // estimated HRmax from the profile, if available
  longRunDay: number; // weekday the long run lands on (0=Sun..6=Sat)
}

// Weekly layouts as an ordered sequence of roles RELATIVE to the long-run day: index 0 is the
// long run, index 1 the day after, … index 6 the day before. The generator rotates this onto
// real weekdays around whichever day the user picks. Lift days are kept away from the long run
// and quality days so heavy legs don't run into hard aerobic work.
const LAYOUTS: Record<number, Role[]> = {
  3: ['long', 'rest', 'rest', 'lower', 'rest', 'quality', 'rest'],
  4: ['long', 'rest', 'lower', 'quality', 'rest', 'upper', 'rest'],
  5: ['long', 'rest', 'quality', 'upper', 'lower', 'rest', 'easy'],
  6: ['long', 'upper', 'quality', 'lower', 'easy', 'rest', 'easy'],
  7: ['long', 'upper', 'quality', 'easy', 'lower', 'easy', 'cross'],
};

function layoutFor(frequency: number): Role[] {
  const clamped = Math.max(3, Math.min(7, Math.round(frequency)));
  return LAYOUTS[clamped];
}

const TAPER_WEEKS: Record<RaceDistance, number> = {
  '5k': 1,
  '10k': 1,
  half: 2,
  full: 3,
  ultra: 3,
};

const LONG_FRACTION: Record<RaceDistance, number> = {
  '5k': 0.28,
  '10k': 0.3,
  half: 0.34,
  full: 0.34,
  ultra: 0.36,
};

const LONG_CAP_KM: Record<RaceDistance, number> = {
  '5k': 12,
  '10k': 16,
  half: 24,
  full: 36,
  ultra: 40,
};

const DEFAULT_BASELINE_KM: Record<RaceDistance, number> = {
  '5k': 25,
  '10k': 30,
  half: 40,
  full: 50,
  ultra: 60,
};

const TAPER_FACTORS: Record<number, number[]> = {
  1: [0.55],
  2: [0.7, 0.5],
  3: [0.75, 0.6, 0.45],
};

function assignPhases(totalWeeks: number, taperW: number): Phase[] {
  const ramp = Math.max(1, totalWeeks - taperW);
  const base = Math.max(1, Math.ceil(ramp * 0.45));
  const peak = Math.min(ramp - base, Math.max(0, Math.round(ramp * 0.2)));
  const build = Math.max(0, ramp - base - peak);
  const phases: Phase[] = [];
  for (let i = 0; i < totalWeeks; i++) {
    if (i < base) phases.push('base');
    else if (i < base + build) phases.push('build');
    else if (i < ramp) phases.push('peak');
    else phases.push('taper');
  }
  return phases;
}

function weeklyVolumes(
  totalWeeks: number,
  taperW: number,
  baseline: number,
  phases: Phase[],
): number[] {
  const ramp = Math.max(1, totalWeeks - taperW);
  const peakVol = baseline * 1.35;
  const taperFactors = TAPER_FACTORS[Math.min(3, Math.max(1, taperW))] ?? TAPER_FACTORS[1];
  const out: number[] = [];
  for (let w = 0; w < totalWeeks; w++) {
    if (phases[w] === 'taper') {
      const ti = w - ramp;
      const factor = taperFactors[Math.min(ti, taperFactors.length - 1)] ?? 0.5;
      out.push(peakVol * factor);
    } else {
      const t = ramp <= 1 ? 1 : w / (ramp - 1);
      let v = baseline + (peakVol - baseline) * t;
      if ((w + 1) % 4 === 0) v *= 0.8; // recovery down-week
      out.push(v);
    }
  }
  return out;
}

function roleToType(role: Role): SessionType {
  if (role === 'lower' || role === 'upper') return 'strength';
  if (role === 'cross') return 'cross';
  if (role === 'rest') return 'rest';
  return 'run';
}

/** Build the default weekday->type structure, rotated so the long run lands on longRunDay. */
export function defaultStructure(frequency: number, longRunDay: number): PlanStructure {
  const layout = layoutFor(frequency);
  const structure: PlanStructure = {};
  layout.forEach((role, offset) => {
    const weekday = (longRunDay + offset) % 7;
    structure[weekday] = roleToType(role);
  });
  return structure;
}

function countRole(layout: Role[], role: Role): number {
  return layout.filter((r) => r === role).length;
}

/**
 * Generate all ScheduledSession instances from start date to race date.
 * Output rows are fully editable; the PlanTemplate stays the source of truth for regeneration.
 */
export function generatePlan(cfg: PlanConfig): NewScheduled[] {
  const span = daysBetween(cfg.startDate, cfg.raceDate);
  if (span < 0) return [];

  const totalWeeks = Math.max(1, weeksBetween(cfg.startDate, cfg.raceDate) + 1);
  const taperW = Math.max(0, Math.min(totalWeeks - 1, TAPER_WEEKS[cfg.raceDistance]));
  const phases = assignPhases(totalWeeks, taperW);
  const baseline = cfg.baselineWeeklyKm ?? DEFAULT_BASELINE_KM[cfg.raceDistance];
  const volumes = weeklyVolumes(totalWeeks, taperW, baseline, phases);
  const layout = layoutFor(cfg.weeklyFrequency);
  const easyCount = countRole(layout, 'easy');

  // Paces: fall back to a moderate default goal if none set, so targets still render.
  const goal = cfg.goalSeconds ?? Math.round((RACE_DISTANCE_METERS[cfg.raceDistance] / 1000) * 330);
  const paces: TrainingPaces = trainingPaces(cfg.raceDistance, goal);

  const rows: NewScheduled[] = [];

  for (let d = 0; d <= span; d++) {
    const date = addDaysISO(cfg.startDate, d);
    const weekIdx = Math.min(weeksBetween(cfg.startDate, date), totalWeeks - 1);
    const phase = phases[weekIdx];
    const vol = volumes[weekIdx];

    // Race day
    if (date === cfg.raceDate) {
      rows.push({
        date,
        type: 'run',
        phase: 'taper',
        planned_json: JSON.stringify({
          label: 'RACE DAY',
          workout_kind: 'race_pace',
          target_pace_s_per_km: paces.race_pace,
          target_hr: cfg.maxHr ? formatHrRange(hrRangeForKind('race_pace', cfg.maxHr)) : undefined,
          distance_m: RACE_DISTANCE_METERS[cfg.raceDistance],
          rationale: 'The goal event. Trust the taper, run your plan.',
        }),
        status: 'planned',
        flag_reason: null,
        template_id: cfg.templateId,
        linked_session_id: null,
      });
      continue;
    }

    const offset = (weekdayIndex(date) - cfg.longRunDay + 7) % 7;
    const role = layout[offset];
    if (role === 'rest') continue; // empty day = rest; keeps the calendar & reshuffle simple

    const longKm = Math.min(vol * LONG_FRACTION[cfg.raceDistance], LONG_CAP_KM[cfg.raceDistance]);
    const qualKm = Math.max(4, vol * 0.2);
    const easyTotal = Math.max(0, vol - longKm - qualKm);
    const easyKm = easyCount > 0 ? easyTotal / easyCount : Math.max(4, easyTotal);

    let type: SessionType = 'run';
    let planned: object;

    if (role === 'long') {
      const kind: WorkoutKind = phase === 'build' || phase === 'peak' ? 'progression' : 'long';
      planned = runWorkout(kind, {
        distance: cfg.raceDistance,
        phase,
        paces,
        distanceUnit: cfg.distanceUnit,
        maxHr: cfg.maxHr,
        distanceM: longKm * 1000,
      });
    } else if (role === 'quality') {
      const kind = qualityKindForPhase(phase, cfg.raceDistance);
      planned = runWorkout(kind, {
        distance: cfg.raceDistance,
        phase,
        paces,
        distanceUnit: cfg.distanceUnit,
        maxHr: cfg.maxHr,
        distanceM: qualKm * 1000,
      });
    } else if (role === 'easy') {
      planned = runWorkout('easy', {
        distance: cfg.raceDistance,
        phase,
        paces,
        distanceUnit: cfg.distanceUnit,
        maxHr: cfg.maxHr,
        distanceM: easyKm * 1000,
      });
    } else if (role === 'lower') {
      type = 'strength';
      planned = { label: 'Lower body', split: 'lower', exercises: cfg.split.lower };
    } else if (role === 'upper') {
      type = 'strength';
      planned = { label: 'Upper body', split: 'upper', exercises: cfg.split.upper };
    } else {
      // cross
      type = 'cross';
      planned = {
        label: 'Cross-training',
        duration_s: 40 * 60,
        intervals: '40 min easy — bike, swim, row or elliptical (conversational effort)',
        rationale: 'Low-impact aerobic work adds volume without the pounding of extra running.',
      };
    }

    rows.push({
      date,
      type,
      phase,
      planned_json: JSON.stringify(planned),
      status: 'planned',
      flag_reason: null,
      template_id: cfg.templateId,
      linked_session_id: null,
    });
  }

  return rows;
}
