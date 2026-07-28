import type { ProviderActivity, SessionType } from '../models/types';
import { ActivityProvider, NotConfiguredError } from './ActivityProvider';

// Strava adapter. Scaffolded but not live-wired — no client credentials yet.
// To finish wiring (spec MVP phase 4):
//   1. Register an app at https://www.strava.com/settings/api and set clientId below.
//   2. Use expo-auth-session (Authorization Code + PKCE) with an expo deep-link redirect.
//   3. Store tokens in expo-secure-store; refresh on demand.
//   4. Implement fetchActivities() against GET /api/v3/athlete/activities and map with
//      mapStravaType() + the normalizer below. UI code stays unchanged.

const STRAVA_CLIENT_ID: string | null = null; // TODO: set when credentials are available

function mapStravaType(stravaType: string): SessionType {
  const t = stravaType.toLowerCase();
  if (t.includes('run')) return 'run';
  if (t.includes('weight') || t.includes('workout')) return 'strength';
  if (t.includes('yoga') || t.includes('mobility')) return 'mobility';
  return 'cross';
}

/** Normalize a raw Strava activity into winna's ProviderActivity (used once wired). */
export function normalizeStravaActivity(raw: {
  id: number;
  type: string;
  start_date_local: string;
  moving_time: number;
  distance: number;
  average_heartrate?: number;
}): ProviderActivity {
  const distance_m = raw.distance || null;
  const duration_s = raw.moving_time || null;
  const avg_pace_s_per_km =
    distance_m && duration_s ? duration_s / (distance_m / 1000) : null;
  return {
    externalId: String(raw.id),
    source: 'strava',
    date: raw.start_date_local.slice(0, 10),
    type: mapStravaType(raw.type),
    duration_s,
    distance_m,
    avg_pace_s_per_km,
    avg_hr: raw.average_heartrate ?? null,
  };
}

export const stravaProvider: ActivityProvider = {
  key: 'strava',
  displayName: 'Strava',
  supportsDailyMetrics: false, // Strava has no sleep/HRV data
  isConfigured: () => STRAVA_CLIENT_ID !== null,
  async isAuthorized() {
    return false;
  },
  async authorize() {
    throw new NotConfiguredError('Strava');
  },
  async disconnect() {
    // no-op until wired
  },
  async fetchActivities() {
    throw new NotConfiguredError('Strava');
  },
};
