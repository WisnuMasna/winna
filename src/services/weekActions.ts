import {
  listScheduledBetween,
  parsePlanned,
  setScheduledDate,
  setScheduledStatus,
  updateScheduled,
} from '../repositories/plan';
import { addDaysISO, daysBetween, weekDates } from '../domain/dates';
import type { ScheduledSession } from '../models/types';

const isLongRun = (s: ScheduledSession) =>
  s.type === 'run' && ['long', 'progression'].includes(parsePlanned(s).workout_kind ?? '');
const isLegDay = (s: ScheduledSession) => s.type === 'strength' && parsePlanned(s).split === 'lower';
const isRace = (s: ScheduledSession) => parsePlanned(s).label === 'RACE DAY';

/**
 * Reshuffle a week to resolve a long-run / leg-day clash while respecting fixed points
 * (race day, and days that are intentionally rest). Swaps the leg day with a nearby
 * low-conflict session, or moves it to an empty day ≥2 days from the long run.
 */
export async function reshuffleWeek(anyDateInWeek: string): Promise<{ moved: boolean; reason: string }> {
  const dates = weekDates(anyDateInWeek);
  const sessions = await listScheduledBetween(dates[0], dates[6]);

  const longRun = sessions.find(isLongRun);
  const legDay = sessions.find(isLegDay);
  if (!longRun || !legDay) return { moved: false, reason: 'Nothing to reshuffle — no long-run/leg-day clash.' };
  if (Math.abs(daysBetween(longRun.date, legDay.date)) > 1) {
    return { moved: false, reason: 'Week already looks balanced.' };
  }

  // Prefer swapping with an easy/upper/cross session that sits ≥2 days from the long run.
  const candidate = sessions.find(
    (s) =>
      s.id !== legDay.id &&
      s.id !== longRun.id &&
      !isRace(s) &&
      !isLongRun(s) &&
      Math.abs(daysBetween(longRun.date, s.date)) >= 2,
  );
  if (candidate) {
    const legDate = legDay.date;
    await setScheduledDate(legDay.id, candidate.date);
    await setScheduledDate(candidate.id, legDate);
    return { moved: true, reason: `Swapped leg day with ${candidate.type} to buffer the long run.` };
  }

  // Otherwise move the leg day to an empty day ≥2 from the long run.
  const used = new Set(sessions.map((s) => s.date));
  const empty = dates.find((d) => !used.has(d) && Math.abs(daysBetween(longRun.date, d)) >= 2);
  if (empty) {
    await setScheduledDate(legDay.id, empty);
    return { moved: true, reason: 'Moved leg day to a rest day away from the long run.' };
  }

  return { moved: false, reason: 'No free slot to reshuffle into — adjust the week manually.' };
}

/** Push a skipped/missed session to the next day with no scheduled session (up to a week out). */
export async function pushSession(session: ScheduledSession): Promise<string> {
  for (let i = 1; i <= 7; i++) {
    const candidate = addDaysISO(session.date, i);
    const onDay = await listScheduledBetween(candidate, candidate);
    if (onDay.length === 0) {
      await setScheduledDate(session.id, candidate);
      await setScheduledStatus(session.id, 'planned');
      return candidate;
    }
  }
  const next = addDaysISO(session.date, 1);
  await setScheduledDate(session.id, next);
  return next;
}

/** Drop a session — keep the record but mark it skipped (no silent gaps, per spec). */
export async function dropSession(session: ScheduledSession): Promise<void> {
  await setScheduledStatus(session.id, 'skipped');
}

/** Fold a session into the next same-type session: skip this one, note it on the next. */
export async function foldSession(session: ScheduledSession): Promise<boolean> {
  const horizonEnd = addDaysISO(session.date, 14);
  const upcoming = await listScheduledBetween(addDaysISO(session.date, 1), horizonEnd);
  const target = upcoming.find((s) => s.type === session.type && s.status === 'planned');
  await setScheduledStatus(session.id, 'skipped');
  if (target) {
    await updateScheduled(target.id, { flag_reason: `Folded in work from ${session.date}` });
    return true;
  }
  return false;
}
