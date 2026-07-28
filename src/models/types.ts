// Core domain types for winna. These mirror the SQLite schema (see src/db/migrations.ts).
// JSON columns are stored as strings; typed *Details helpers below describe their shape.

export type RaceDistance = '5k' | '10k' | 'half' | 'full' | 'ultra';
export type SessionType = 'run' | 'strength' | 'mobility' | 'rest' | 'cross';
export type Phase = 'base' | 'build' | 'peak' | 'taper';
export type SessionSource = 'manual' | 'strava' | 'garmin';
export type ScheduledStatus = 'planned' | 'done' | 'skipped' | 'flagged';
export type DistanceUnit = 'km' | 'mi';
export type WeightUnit = 'kg' | 'lb';
export type ThemePref = 'system' | 'light' | 'dark';
export type Sex = 'male' | 'female' | 'other';
export type Equipment = 'full_gym' | 'dumbbell' | 'bodyweight';

/** A run workout archetype the suggestion engine produces. */
export type WorkoutKind =
  | 'easy'
  | 'long'
  | 'recovery'
  | 'strides'
  | 'tempo'
  | 'threshold'
  | 'progression'
  | 'vo2max'
  | 'race_pace';

// ---- Settings (singleton row, id = 1) ----
export interface Settings {
  id: number;
  units_distance: DistanceUnit;
  units_weight: WeightUnit;
  theme: ThemePref;
  weekly_mileage_km: number | null; // current baseline used by the plan generator
  hr_zone_updated_at: string | null; // ISO date of last HR/pace zone calibration
  strava_connected: number; // 0 | 1
  garmin_connected: number; // 0 | 1
  // Profile — used to tailor HR zones and default strength loads.
  sex: Sex | null;
  birth_year: number | null;
  height_cm: number | null;
  bodyweight_kg: number | null;
  equipment: Equipment; // default strength equipment for new plans
}

// ---- Strength ----
export interface StrengthExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  unit: WeightUnit;
}

export interface StrengthSplit {
  lower: StrengthExercise[];
  upper: StrengthExercise[];
}

// ---- Plan template (kept separate from ScheduledSession instances) ----
/** Weekday (0=Sun .. 6=Sat) -> the session type the template wants there. */
export type PlanStructure = Record<number, SessionType>;

export interface PlanTemplate {
  id: number;
  name: string | null; // e.g. "Berlin Marathon"
  race_distance: RaceDistance;
  race_date: string; // ISO date (YYYY-MM-DD)
  goal_seconds: number | null; // goal finish time
  weekly_frequency: number; // total training days/week the user wants
  start_date: string; // ISO date the plan starts from
  structure_json: string; // PlanStructure
  strength_split_json: string; // StrengthSplit
  equipment: Equipment;
  chained_from_id: number | null; // race this one builds on top of, if any
  baseline_weekly_km: number | null; // starting weekly volume the plan ramped from
  created_at: string;
}

// ---- Scheduled session instance (generated, fully editable) ----
export interface PlannedDetails {
  label?: string;
  workout_kind?: WorkoutKind;
  distance_m?: number;
  target_pace_s_per_km?: number; // for steady efforts
  target_hr?: string; // e.g. "138–158 bpm" when a profile/age is set
  duration_s?: number;
  intervals?: string; // human-readable structure, e.g. "5 x 1km @ threshold, 90s jog"
  rationale?: string; // "why this workout"
  split?: 'lower' | 'upper';
  exercises?: StrengthExercise[];
}

export interface ScheduledSession {
  id: number;
  date: string; // ISO date
  type: SessionType;
  phase: Phase;
  planned_json: string; // PlannedDetails
  status: ScheduledStatus;
  flag_reason: string | null;
  template_id: number | null;
  linked_session_id: number | null;
}

// ---- Logged session (manual / synced) ----
export interface Session {
  id: number;
  date: string; // ISO date
  type: SessionType;
  source: SessionSource;
  duration_s: number | null;
  distance_m: number | null;
  avg_pace_s_per_km: number | null;
  avg_hr: number | null;
  rpe: number | null; // 1..10
  notes: string | null;
  shoe_id: number | null;
}

export interface StrengthSession {
  id: number;
  session_id: number;
  exercises_json: string; // StrengthExercise[]
}

// ---- Readiness / pain (daily) ----
export interface ReadinessLog {
  id: number;
  date: string; // ISO date
  sleep_quality: number | null; // 1..5
  soreness: number | null; // 1..5
  pain_location: string | null;
  pain_severity: number | null; // 0..5
  notes: string | null;
}

// ---- Persistent injury history (separate from daily readiness) ----
export interface InjuryLog {
  id: number;
  location: string;
  started_date: string; // ISO date
  resolved_date: string | null;
  severity: number | null; // 0..5
  status: 'active' | 'resolved';
  notes: string | null;
}

// ---- Gear ----
export interface Shoe {
  id: number;
  name: string;
  purchased_date: string | null;
  threshold_km: number; // wear-alert threshold
  retired: number; // 0 | 1
}

// ---- Physique tracking (the actual goal: physique maintenance) ----
export interface PhysiqueEntry {
  id: number;
  date: string; // ISO date
  bodyweight: number | null;
  unit: WeightUnit;
  photo_uri: string | null;
  notes: string | null;
}

// ---- Normalized activity from an ActivityProvider (Strava/Garmin) ----
export interface ProviderActivity {
  externalId: string;
  source: SessionSource;
  date: string; // ISO date
  type: SessionType;
  duration_s: number | null;
  distance_m: number | null;
  avg_pace_s_per_km: number | null;
  avg_hr: number | null;
}
