import type { ProviderActivity } from '../models/types';
import { ActivityProvider, NotConfiguredError } from './ActivityProvider';

// Garmin adapter stub. Garmin's Health API requires partner approval and a server-side
// OAuth1.0a/OAuth2 component, so this is intentionally deferred behind the same interface
// as Strava (spec MVP phase 6). Prove the Strava path first, then implement here — no UI
// changes required.

export const garminProvider: ActivityProvider = {
  key: 'garmin',
  displayName: 'Garmin Connect',
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
};
