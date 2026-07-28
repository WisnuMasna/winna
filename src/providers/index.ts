import { ActivityProvider } from './ActivityProvider';
import { stravaProvider } from './StravaProvider';
import { garminProvider } from './GarminProvider';

export { NotConfiguredError } from './ActivityProvider';
export type { ActivityProvider } from './ActivityProvider';

// Registry — screens iterate this, so adding a provider needs no UI changes.
export const providers: ActivityProvider[] = [stravaProvider, garminProvider];

export function getProvider(key: string): ActivityProvider | undefined {
  return providers.find((p) => p.key === key);
}
