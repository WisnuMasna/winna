import type { DailyMetrics, HrvStatus, ProviderActivity } from '../models/types';
import { ActivityProvider, NotConfiguredError } from './ActivityProvider';

// When the Garmin Health API is wired, map its wellness payloads into winna's DailyMetrics.
// Training Readiness (src/domain/trainingReadiness.ts) consumes this — no other code changes.
export function normalizeGarminMetrics(dateISO: string, raw: {
  sleepScore?: number;
  hrvStatus?: string; // e.g. 'BALANCED' | 'UNBALANCED' | 'LOW' | 'POOR'
  hrvLastNightAvg?: number;
  recoveryTimeHours?: number;
  restingHeartRate?: number;
  averageStressLevel?: number;
  bodyBattery?: number;
}): DailyMetrics {
  const status = raw.hrvStatus?.toLowerCase();
  const hrv_status: HrvStatus | null =
    status === 'balanced' || status === 'unbalanced' || status === 'low' || status === 'poor'
      ? (status as HrvStatus)
      : null;
  return {
    date: dateISO,
    source: 'garmin',
    sleep_score: raw.sleepScore ?? null,
    hrv_status,
    hrv_ms: raw.hrvLastNightAvg ?? null,
    recovery_hours: raw.recoveryTimeHours ?? null,
    resting_hr: raw.restingHeartRate ?? null,
    stress: raw.averageStressLevel ?? null,
    body_battery: raw.bodyBattery ?? null,
    updated_at: new Date().toISOString(),
  };
}

// Garmin adapter stub. Garmin's Health API requires partner approval and a server-side
// OAuth1.0a/OAuth2 component, so this is intentionally deferred behind the same interface
// as Strava (spec MVP phase 6). Prove the Strava path first, then implement here — no UI
// changes required.

export const garminProvider: ActivityProvider = {
  key: 'garmin',
  displayName: 'Garmin Connect',
  supportsDailyMetrics: true, // sleep, HRV, recovery, stress, Body Battery
  isConfigured: () => false,
  async isAuthorized() {
    return false;
  },
  async authorize() {
    throw new NotConfiguredError('Garmin Connect');
  },
  async disconnect() {
    // no-op until wired
  },
  async fetchActivities(): Promise<ProviderActivity[]> {
    throw new NotConfiguredError('Garmin Connect');
  },
  async fetchDailyMetrics(): Promise<DailyMetrics> {
    throw new NotConfiguredError('Garmin Connect');
  },
};
