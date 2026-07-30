import type { Equipment, RaceDistance, StrengthSplit } from '../models/types';
import {
  createTemplate,
  clearScheduledForTemplate,
  bulkInsertScheduled,
  getTemplate,
  updateTemplate,
} from '../repositories/plan';
import { defaultStructure, generatePlan } from '../domain/planGenerator';
import { defaultStrengthSplit } from '../domain/strength';
import { addDaysISO, todayISO } from '../domain/dates';
import { getSettings } from '../repositories/settings';
import { ageFromBirthYear, estimatedMaxHr } from '../domain/hr';

export interface RaceInput {
  name: string | null;
  raceDistance: RaceDistance;
  raceDate: string; // ISO
  goalSeconds: number | null;
  weeklyFrequency: number;
  baselineWeeklyKm: number | null;
  equipment: Equipment;
  distanceUnit: 'km' | 'mi';
  /** Weekday the long run lands on (0=Sun..6=Sat). Defaults to Saturday. */
  longRunDay?: number;
  /** Build this race on top of a previous one: start after it and carry fitness forward. */
  chainAfterId?: number | null;
  /** Only used for a standalone race; ignored when chaining. Defaults to today. */
  startDate?: string;
  /** Preserve an edited/custom split instead of regenerating defaults. */
  split?: StrengthSplit;
}

const PEAK_MULTIPLIER = 1.35; // how much a plan ramps above its starting volume
const CHAIN_GAP_DAYS = 3; // recovery gap between a race and the next block
const DEFAULT_LONG_RUN_DAY = 6; // Saturday

async function maxHrFromProfile(): Promise<number | null> {
  const settings = await getSettings();
  return settings.birth_year ? estimatedMaxHr(ageFromBirthYear(settings.birth_year)) : null;
}

/** Resolve start date + starting volume, carrying peak fitness forward when chaining. */
async function resolveStartAndBaseline(
  input: RaceInput,
): Promise<{ startDate: string; baseline: number | null }> {
  if (input.chainAfterId) {
    const prev = await getTemplate(input.chainAfterId);
    if (prev) {
      const prevBaseline = prev.baseline_weekly_km;
      const carried = prevBaseline != null ? Math.round(prevBaseline * PEAK_MULTIPLIER) : null;
      return {
        startDate: addDaysISO(prev.race_date, CHAIN_GAP_DAYS),
        baseline: input.baselineWeeklyKm ?? carried,
      };
    }
  }
  return { startDate: input.startDate ?? todayISO(), baseline: input.baselineWeeklyKm };
}

async function generateInto(templateId: number, input: RaceInput, startDate: string, baseline: number | null) {
  const settings = await getSettings();
  const split = input.split ?? defaultStrengthSplit(settings.bodyweight_kg, input.equipment);
  const rows = generatePlan({
    raceDistance: input.raceDistance,
    raceDate: input.raceDate,
    goalSeconds: input.goalSeconds,
    weeklyFrequency: input.weeklyFrequency,
    startDate,
    baselineWeeklyKm: baseline,
    split,
    templateId,
    distanceUnit: input.distanceUnit,
    maxHr: await maxHrFromProfile(),
    longRunDay: input.longRunDay ?? DEFAULT_LONG_RUN_DAY,
  });
  await clearScheduledForTemplate(templateId);
  await bulkInsertScheduled(rows);
  return split;
}

/** Create a new race (optionally chained after an existing one) and generate its sessions. */
export async function createRace(input: RaceInput): Promise<number> {
  const { startDate, baseline } = await resolveStartAndBaseline(input);
  const settings = await getSettings();
  const longRunDay = input.longRunDay ?? DEFAULT_LONG_RUN_DAY;
  const split = input.split ?? defaultStrengthSplit(settings.bodyweight_kg, input.equipment);
  const structure = defaultStructure(input.weeklyFrequency, longRunDay);

  const templateId = await createTemplate({
    name: input.name,
    race_distance: input.raceDistance,
    race_date: input.raceDate,
    goal_seconds: input.goalSeconds,
    weekly_frequency: input.weeklyFrequency,
    start_date: startDate,
    structure_json: JSON.stringify(structure),
    strength_split_json: JSON.stringify(split),
    equipment: input.equipment,
    chained_from_id: input.chainAfterId ?? null,
    baseline_weekly_km: baseline,
    long_run_day: longRunDay,
  });

  await generateInto(templateId, input, startDate, baseline);
  return templateId;
}

/** Edit an existing race and regenerate only its sessions (other races are untouched). */
export async function editRace(templateId: number, input: RaceInput): Promise<void> {
  const { startDate, baseline } = await resolveStartAndBaseline(input);
  const split = await generateInto(templateId, input, startDate, baseline);
  await updateTemplate(templateId, {
    name: input.name,
    race_distance: input.raceDistance,
    race_date: input.raceDate,
    goal_seconds: input.goalSeconds,
    weekly_frequency: input.weeklyFrequency,
    start_date: startDate,
    structure_json: JSON.stringify(defaultStructure(input.weeklyFrequency, input.longRunDay ?? DEFAULT_LONG_RUN_DAY)),
    strength_split_json: JSON.stringify(split),
    equipment: input.equipment,
    chained_from_id: input.chainAfterId ?? null,
    baseline_weekly_km: baseline,
    long_run_day: input.longRunDay ?? DEFAULT_LONG_RUN_DAY,
  });
}
