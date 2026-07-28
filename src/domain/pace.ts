import type { RaceDistance, WorkoutKind } from '../models/types';

// Formula-based pace math (no ML, per spec). Uses Riegel to convert race results/goals,
// then derives training paces as offsets from goal race pace. All outputs are starting
// points the user can override.

export const RACE_DISTANCE_METERS: Record<RaceDistance, number> = {
  '5k': 5000,
  '10k': 10000,
  half: 21097.5,
  full: 42195,
  ultra: 50000,
};

export const RACE_DISTANCE_LABEL: Record<RaceDistance, string> = {
  '5k': '5K',
  '10k': '10K',
  half: 'Half Marathon',
  full: 'Marathon',
  ultra: 'Ultra (50K)',
};

const RIEGEL_EXPONENT = 1.06;

/** Riegel: predict finish time (s) at targetDist from a known result. */
export function riegelPredict(
  knownDistanceM: number,
  knownTimeS: number,
  targetDistanceM: number,
): number {
  return knownTimeS * Math.pow(targetDistanceM / knownDistanceM, RIEGEL_EXPONENT);
}

/** Goal pace in s/km from a goal finish time over a race distance. */
export function goalPaceSPerKm(distance: RaceDistance, goalSeconds: number): number {
  const km = RACE_DISTANCE_METERS[distance] / 1000;
  return goalSeconds / km;
}

/** Predict an equivalent goal time for `distance` from a recent race result. */
export function goalFromRecentResult(
  recentDistanceM: number,
  recentTimeS: number,
  distance: RaceDistance,
): number {
  return Math.round(riegelPredict(recentDistanceM, recentTimeS, RACE_DISTANCE_METERS[distance]));
}

export type TrainingPaces = Record<
  'recovery' | 'easy' | 'long' | 'race_pace' | 'tempo' | 'threshold' | 'vo2max',
  number // s/km
>;

// Whether the goal pace sits near threshold (short races) or near tempo/MP effort (long races).
function isShortRace(distance: RaceDistance): boolean {
  return distance === '5k' || distance === '10k';
}

/**
 * Derive training paces (s/km) from goal race pace.
 * Offsets differ by race type because a 5K goal pace is ~VO2max effort while a
 * marathon goal pace is ~tempo effort. Heuristic, editable.
 */
export function trainingPaces(distance: RaceDistance, goalSeconds: number): TrainingPaces {
  const gp = goalPaceSPerKm(distance, goalSeconds);
  if (isShortRace(distance)) {
    return {
      race_pace: gp,
      vo2max: gp - 5,
      threshold: gp + 15,
      tempo: gp + 25,
      long: gp + 70,
      easy: gp + 65,
      recovery: gp + 95,
    };
  }
  // half / full / ultra
  return {
    race_pace: gp,
    threshold: gp - 20,
    tempo: gp - 8,
    vo2max: gp - 45,
    long: gp + 20,
    easy: gp + 38,
    recovery: gp + 62,
  };
}

/** The training pace a given workout kind should target. */
export function paceForKind(kind: WorkoutKind, paces: TrainingPaces): number | undefined {
  switch (kind) {
    case 'recovery':
      return paces.recovery;
    case 'easy':
    case 'strides':
      return paces.easy;
    case 'long':
    case 'progression':
      return paces.long;
    case 'tempo':
      return paces.tempo;
    case 'threshold':
      return paces.threshold;
    case 'vo2max':
      return paces.vo2max;
    case 'race_pace':
      return paces.race_pace;
    default:
      return undefined;
  }
}

/** Parse "mm:ss" or "h:mm:ss" goal time to seconds. */
export function parseGoalTime(text: string): number | null {
  const parts = text.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

export function formatGoalTime(seconds: number | null): string {
  if (seconds == null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
