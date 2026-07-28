import type { Sex, WorkoutKind } from '../models/types';

// Age-based HR estimation and training zones. Formula-based (no chest strap required),
// so "easy" and "threshold" can carry a heart-rate target alongside pace. Estimates —
// a field test or lab number is always more accurate, and the user can ignore these.

/** Tanaka (2001): HRmax ≈ 208 − 0.7 × age. More accurate across ages than 220−age. */
export function estimatedMaxHr(age: number): number {
  return Math.round(208 - 0.7 * age);
}

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return Math.max(0, now.getFullYear() - birthYear);
}

export function birthYearFromAge(age: number, now = new Date()): number {
  return now.getFullYear() - age;
}

// Zone as a fraction of HRmax per workout kind. Ranges overlap intentionally — effort is
// a band, not a point.
const ZONE_PCT: Record<WorkoutKind, [number, number]> = {
  recovery: [0.6, 0.7],
  easy: [0.68, 0.78],
  long: [0.7, 0.8],
  strides: [0.68, 0.8],
  progression: [0.72, 0.85],
  tempo: [0.8, 0.87],
  threshold: [0.87, 0.92],
  race_pace: [0.83, 0.9],
  vo2max: [0.93, 1.0],
};

export function hrRangeForKind(kind: WorkoutKind, maxHr: number): [number, number] {
  const [lo, hi] = ZONE_PCT[kind];
  return [Math.round((maxHr * lo) / 5) * 5, Math.round((maxHr * hi) / 5) * 5];
}

export function formatHrRange(range: [number, number]): string {
  return `${range[0]}–${range[1]} bpm`;
}

/** Five broad training zones for display on the profile screen. */
export function trainingZones(maxHr: number): { name: string; range: [number, number]; note: string }[] {
  const z = (lo: number, hi: number): [number, number] => [
    Math.round((maxHr * lo) / 5) * 5,
    Math.round((maxHr * hi) / 5) * 5,
  ];
  return [
    { name: 'Z1 Recovery', range: z(0.5, 0.6), note: 'Very easy, active recovery' },
    { name: 'Z2 Easy', range: z(0.6, 0.75), note: 'Aerobic base — most running' },
    { name: 'Z3 Tempo', range: z(0.75, 0.85), note: 'Comfortably hard' },
    { name: 'Z4 Threshold', range: z(0.85, 0.92), note: 'Sustainable hard' },
    { name: 'Z5 VO2max', range: z(0.92, 1.0), note: 'Intervals, max effort' },
  ];
}

// Sex is captured for the profile and future refinements; the Tanaka HRmax estimate itself
// is not sex-specific, so we don't fabricate a difference here.
export function describeProfileCompleteness(sex: Sex | null, birthYear: number | null): boolean {
  return sex != null && birthYear != null;
}
