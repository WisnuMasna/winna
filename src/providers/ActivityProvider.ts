import type { ProviderActivity, SessionSource } from '../models/types';

// Shared interface so adding/swapping activity sources (Strava, Garmin, …) never touches
// UI code (spec). Live OAuth + fetch are wired later; the stubs below implement the shape.

export interface ActivityProvider {
  readonly key: SessionSource;
  readonly displayName: string;
  /** Whether OAuth credentials are compiled in / connected. */
  isConfigured(): boolean;
  isAuthorized(): Promise<boolean>;
  /** Kick off the OAuth flow. Throws NotConfiguredError until credentials are provided. */
  authorize(): Promise<void>;
  disconnect(): Promise<void>;
  /** Pull activities since an ISO date, normalized into ProviderActivity. */
  fetchActivities(sinceISO: string): Promise<ProviderActivity[]>;
}

export class NotConfiguredError extends Error {
  constructor(providerName: string) {
    super(
      `${providerName} is not configured yet. Add API credentials to enable syncing (see src/providers).`,
    );
    this.name = 'NotConfiguredError';
  }
}
