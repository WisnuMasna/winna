import type {
  Phase,
  PlannedDetails,
  RaceDistance,
  WorkoutKind,
} from '../models/types';
import { paceForKind, TrainingPaces } from './pace';
import { formatPace } from './units';
import { formatHrRange, hrRangeForKind } from './hr';

// Workout Suggestion Engine: turns (phase, race distance, paces) into concrete, editable
// run-workout templates, each carrying a short "why this workout" rationale.

const RATIONALE: Record<WorkoutKind, string> = {
  easy: 'Builds aerobic base and capillary density with minimal fatigue cost — the bread and butter of endurance.',
  long: 'Develops fatigue resistance and fat metabolism; the single most important session for race-day endurance.',
  recovery: 'Very easy running promotes blood flow and recovery without adding training stress.',
  strides: 'Short accelerations sharpen neuromuscular coordination and running economy without hard effort.',
  tempo: 'Sustained "comfortably hard" running raises the pace you can hold aerobically — key for marathon pace.',
  threshold: 'Running at lactate threshold pushes the point where fatigue accumulates, improving sustainable speed.',
  progression: 'Finishing faster than you start trains pacing discipline and running strong on tired legs.',
  vo2max: 'Hard intervals near max aerobic power raise your ceiling — most useful for 5K/10K sharpness.',
  race_pace: 'Rehearsing goal race pace dials in effort, fueling and pacing so it feels automatic on race day.',
};

function isShort(distance: RaceDistance): boolean {
  return distance === '5k' || distance === '10k';
}

/** What the mid-week "quality" slot becomes in a given phase. */
export function qualityKindForPhase(phase: Phase, distance: RaceDistance): WorkoutKind {
  switch (phase) {
    case 'base':
      return 'strides';
    case 'build':
      return isShort(distance) ? 'threshold' : 'tempo';
    case 'peak':
      return isShort(distance) ? 'vo2max' : 'race_pace';
    case 'taper':
      return 'strides';
  }
}

interface RunContext {
  distance: RaceDistance;
  phase: Phase;
  paces: TrainingPaces;
  distanceUnit: 'km' | 'mi';
  distanceM?: number; // planned distance for steady runs
  maxHr?: number | null; // when set, sessions carry an HR target too
}

/** Build a concrete run workout PlannedDetails for a kind. */
export function runWorkout(kind: WorkoutKind, ctx: RunContext): PlannedDetails {
  const { paces, distanceUnit } = ctx;
  const pace = paceForKind(kind, paces);
  const base: PlannedDetails = {
    workout_kind: kind,
    target_pace_s_per_km: pace,
    target_hr: ctx.maxHr ? formatHrRange(hrRangeForKind(kind, ctx.maxHr)) : undefined,
    distance_m: ctx.distanceM,
    rationale: RATIONALE[kind],
  };

  switch (kind) {
    case 'easy':
      return { ...base, label: 'Easy run', intervals: `Relaxed @ ${formatPace(paces.easy, distanceUnit)}` };
    case 'recovery':
      return { ...base, label: 'Recovery jog', intervals: `Very easy @ ${formatPace(paces.recovery, distanceUnit)}` };
    case 'long':
      return { ...base, label: 'Long run', intervals: `Steady @ ${formatPace(paces.long, distanceUnit)}` };
    case 'progression':
      return {
        ...base,
        label: 'Progression long run',
        intervals: `Start easy, finish last third @ ${formatPace(paces.tempo, distanceUnit)}`,
      };
    case 'strides':
      return {
        ...base,
        label: 'Easy + strides',
        intervals: `Easy @ ${formatPace(paces.easy, distanceUnit)} + 6 x 20s strides`,
      };
    case 'tempo':
      return {
        ...base,
        label: 'Tempo run',
        intervals: `20–30 min @ ${formatPace(paces.tempo, distanceUnit)}`,
      };
    case 'threshold':
      return {
        ...base,
        label: 'Threshold intervals',
        intervals: `5 x 1km @ ${formatPace(paces.threshold, distanceUnit)}, 90s jog`,
      };
    case 'vo2max':
      return {
        ...base,
        label: 'VO2max intervals',
        intervals: `5 x 3min hard / 3min easy @ ~${formatPace(paces.vo2max, distanceUnit)}`,
      };
    case 'race_pace':
      return {
        ...base,
        label: 'Race-pace segments',
        intervals: `3 x 2km @ ${formatPace(paces.race_pace, distanceUnit)}, 3min easy`,
      };
  }
}

/**
 * A browseable menu of workout options appropriate to a phase + distance, so when the
 * user edits a scheduled run they can swap in a different suggestion (all editable).
 */
export function phaseWorkoutMenu(
  phase: Phase,
  distance: RaceDistance,
  paces: TrainingPaces,
  distanceUnit: 'km' | 'mi',
): PlannedDetails[] {
  const ctx: RunContext = { distance, phase, paces, distanceUnit };
  const short = isShort(distance);

  const menus: Record<Phase, WorkoutKind[]> = {
    base: ['easy', 'long', 'strides', 'recovery'],
    build: short
      ? ['threshold', 'vo2max', 'tempo', 'long', 'easy']
      : ['tempo', 'threshold', 'progression', 'long', 'easy'],
    peak: short
      ? ['vo2max', 'threshold', 'race_pace', 'easy']
      : ['race_pace', 'tempo', 'progression', 'long', 'easy'],
    taper: ['strides', 'race_pace', 'easy', 'recovery'],
  };

  return menus[phase].map((kind) => runWorkout(kind, ctx));
}

export function rationaleFor(kind: WorkoutKind): string {
  return RATIONALE[kind];
}
