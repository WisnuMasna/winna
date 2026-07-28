import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Each bottom tab hosts its own native-stack containing the tab's home screen plus the
// detail screens reachable from it. Because detail screens live *inside* a tab's stack,
// the bottom tab bar stays visible everywhere — there is always a one-tap path home.
// A single param list is shared by every stack so screen files need no per-tab typing.

export type AppStackParamList = {
  Today: undefined;
  Plan: undefined;
  Log: undefined;
  Progress: undefined;
  SessionEdit: { scheduledId?: number; sessionId?: number; date?: string };
  RaceSetup: { templateId?: number; chainAfterId?: number } | undefined;
  Races: undefined;
  Profile: undefined;
  Zones: undefined;
  Readiness: { date?: string } | undefined;
  Injuries: undefined;
  Shoes: undefined;
  Physique: undefined;
  Settings: undefined;
  Integrations: undefined;
};

// Tab route names differ from the stack home-screen names ('Today' etc.) to avoid nested
// same-name screens. Labels are set via tabBarLabel.
export type TabName = 'TodayTab' | 'PlanTab' | 'LogTab' | 'ProgressTab';
export type TabParamList = Record<TabName, undefined>;

// Kept for backwards-compatible screen typing. Both are now stack props over the shared list.
export type RootStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;
export type TabScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;
