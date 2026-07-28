import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarWeeks,
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  isSameDay,
} from 'date-fns';

// winna stores dates as ISO calendar dates (YYYY-MM-DD), no time component.
// Weeks start on Monday to match how training weeks are usually planned.

const WEEK_OPTS = { weekStartsOn: 1 as const }; // Monday

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(iso: string): Date {
  return parseISO(iso);
}

export function addDaysISO(iso: string, days: number): string {
  return toISODate(addDays(parseISO(iso), days));
}

export function daysBetween(fromISO: string, toISO: string): number {
  return differenceInCalendarDays(parseISO(toISO), parseISO(fromISO));
}

export function weeksBetween(fromISO: string, toISO: string): number {
  return differenceInCalendarWeeks(parseISO(toISO), parseISO(fromISO), WEEK_OPTS);
}

export function weekStartISO(iso: string): string {
  return toISODate(startOfWeek(parseISO(iso), WEEK_OPTS));
}

export function weekEndISO(iso: string): string {
  return toISODate(endOfWeek(parseISO(iso), WEEK_OPTS));
}

/** The 7 ISO dates of the week containing `iso`, Monday first. */
export function weekDates(iso: string): string[] {
  const start = startOfWeek(parseISO(iso), WEEK_OPTS);
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)));
}

export function isSameISODay(a: string, b: string): boolean {
  return isSameDay(parseISO(a), parseISO(b));
}

/** JS weekday index 0=Sun..6=Sat for an ISO date. */
export function weekdayIndex(iso: string): number {
  return parseISO(iso).getDay();
}

// Display helpers
export function formatShort(iso: string): string {
  return format(parseISO(iso), 'EEE d MMM');
}

export function formatWeekdayShort(iso: string): string {
  return format(parseISO(iso), 'EEE');
}

export function formatDayNum(iso: string): string {
  return format(parseISO(iso), 'd');
}

export function formatLong(iso: string): string {
  return format(parseISO(iso), 'EEEE, d MMMM yyyy');
}
