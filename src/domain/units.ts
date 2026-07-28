import type { DistanceUnit, WeightUnit } from '../models/types';

// All distances are stored internally in meters, weights in kg, paces in s/km.
// These helpers convert to/from the user's chosen display units and format them.

const KM_PER_MI = 1.609344;
const KG_PER_LB = 0.45359237;

// ---- Distance ----
export function metersToDisplay(meters: number, unit: DistanceUnit): number {
  const km = meters / 1000;
  return unit === 'mi' ? km / KM_PER_MI : km;
}

export function displayToMeters(value: number, unit: DistanceUnit): number {
  const km = unit === 'mi' ? value * KM_PER_MI : value;
  return km * 1000;
}

export function formatDistance(meters: number | null, unit: DistanceUnit, digits = 1): string {
  if (meters == null) return '—';
  return `${metersToDisplay(meters, unit).toFixed(digits)} ${unit}`;
}

// ---- Pace (stored s/km) ----
export function paceToDisplay(secPerKm: number, unit: DistanceUnit): number {
  return unit === 'mi' ? secPerKm * KM_PER_MI : secPerKm;
}

export function formatPace(secPerKm: number | null, unit: DistanceUnit): string {
  if (secPerKm == null || !isFinite(secPerKm) || secPerKm <= 0) return '—';
  const perUnit = paceToDisplay(secPerKm, unit);
  const m = Math.floor(perUnit / 60);
  const s = Math.round(perUnit % 60);
  const ss = s === 60 ? '00' : String(s).padStart(2, '0');
  const mm = s === 60 ? m + 1 : m;
  return `${mm}:${ss}/${unit}`;
}

// ---- Weight (stored kg) ----
export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg / KG_PER_LB : kg;
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value * KG_PER_LB : value;
}

export function formatWeight(kg: number | null, unit: WeightUnit, digits = 1): string {
  if (kg == null) return '—';
  return `${kgToDisplay(kg, unit).toFixed(digits)} ${unit}`;
}

// ---- Duration (seconds) ----
export function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Parse "h:mm:ss" or "mm:ss" or a plain number of minutes into seconds. */
export function parseDurationInput(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!trimmed.includes(':')) {
    const mins = parseFloat(trimmed);
    return isNaN(mins) ? null : Math.round(mins * 60);
  }
  const parts = trimmed.split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}
