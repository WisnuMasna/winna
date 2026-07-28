import type { Equipment, StrengthExercise, StrengthSplit } from '../models/types';

// Default 2x/week hybrid splits by available equipment (spec: some users are bodyweight-only).
// Loads scale to bodyweight; when unknown, a 75 kg reference is assumed. All editable defaults.

interface ExDef {
  name: string;
  sets: number;
  reps: number;
  mult: number; // × bodyweight for the load; 0 = a bodyweight movement (no external load)
}

const SPLITS: Record<Equipment, { lower: ExDef[]; upper: ExDef[] }> = {
  full_gym: {
    lower: [
      { name: 'Romanian Deadlift', sets: 3, reps: 8, mult: 1.0 },
      { name: 'Bulgarian Split Squat', sets: 3, reps: 10, mult: 0.25 },
      { name: 'Pull-ups', sets: 3, reps: 8, mult: 0 },
      { name: 'Barbell Row', sets: 3, reps: 10, mult: 0.6 },
      { name: 'Triceps Pushdown', sets: 3, reps: 12, mult: 0.3 },
    ],
    upper: [
      { name: 'Bench Press', sets: 3, reps: 8, mult: 0.75 },
      { name: 'Overhead Press', sets: 3, reps: 8, mult: 0.45 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 10, mult: 0.28 },
      { name: 'Lateral Raise', sets: 3, reps: 15, mult: 0.12 },
      { name: 'Biceps Curl', sets: 3, reps: 12, mult: 0.18 },
    ],
  },
  dumbbell: {
    lower: [
      { name: 'Dumbbell RDL', sets: 3, reps: 10, mult: 0.4 },
      { name: 'Bulgarian Split Squat (DB)', sets: 3, reps: 10, mult: 0.22 },
      { name: 'Pull-ups', sets: 3, reps: 8, mult: 0 },
      { name: 'One-arm DB Row', sets: 3, reps: 10, mult: 0.3 },
      { name: 'DB Skullcrusher', sets: 3, reps: 12, mult: 0.12 },
    ],
    upper: [
      { name: 'DB Bench Press', sets: 3, reps: 10, mult: 0.32 },
      { name: 'DB Shoulder Press', sets: 3, reps: 10, mult: 0.22 },
      { name: 'Incline DB Press', sets: 3, reps: 10, mult: 0.28 },
      { name: 'Lateral Raise', sets: 3, reps: 15, mult: 0.12 },
      { name: 'DB Curl', sets: 3, reps: 12, mult: 0.16 },
    ],
  },
  bodyweight: {
    lower: [
      { name: 'Single-leg RDL', sets: 3, reps: 12, mult: 0 },
      { name: 'Bulgarian Split Squat', sets: 3, reps: 15, mult: 0 },
      { name: 'Pull-ups', sets: 3, reps: 8, mult: 0 },
      { name: 'Inverted Rows', sets: 3, reps: 12, mult: 0 },
      { name: 'Nordic Curl (assisted)', sets: 3, reps: 8, mult: 0 },
    ],
    upper: [
      { name: 'Push-ups', sets: 3, reps: 15, mult: 0 },
      { name: 'Pike Push-ups', sets: 3, reps: 10, mult: 0 },
      { name: 'Dips', sets: 3, reps: 10, mult: 0 },
      { name: 'Decline Push-ups', sets: 3, reps: 12, mult: 0 },
      { name: 'Chin-ups', sets: 3, reps: 8, mult: 0 },
    ],
  },
};

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Default split for the chosen equipment, with loads scaled to bodyweight (75 kg assumed when
 * unknown). Bodyweight-only movements carry no external load. Everything is editable.
 */
export function defaultStrengthSplit(
  bodyweightKg?: number | null,
  equipment: Equipment = 'full_gym',
): StrengthSplit {
  const bw = bodyweightKg && bodyweightKg > 0 ? bodyweightKg : 75;
  const toExercise = (d: ExDef): StrengthExercise => ({
    name: d.name,
    sets: d.sets,
    reps: d.reps,
    weight: d.mult > 0 ? roundTo(bw * d.mult, 2.5) : 0,
    unit: 'kg',
  });
  const split = SPLITS[equipment] ?? SPLITS.full_gym;
  return {
    lower: split.lower.map(toExercise),
    upper: split.upper.map(toExercise),
  };
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  full_gym: 'Full gym',
  dumbbell: 'Dumbbells',
  bodyweight: 'Bodyweight',
};

/** Total volume (sets x reps x weight) for a strength session, for the Progress dashboard. */
export function strengthVolumeKg(exercises: StrengthExercise[]): number {
  return exercises.reduce((sum, e) => {
    const w = e.unit === 'lb' ? e.weight * 0.45359237 : e.weight;
    return sum + e.sets * e.reps * w;
  }, 0);
}
