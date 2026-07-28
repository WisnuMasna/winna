import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, NavigationContainer, Theme as NavTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../state/ThemeContext';
import type { AppStackParamList, TabName, TabParamList } from './types';

import { TodayScreen } from '../screens/today/TodayScreen';
import { PlanScreen } from '../screens/plan/PlanScreen';
import { LogScreen } from '../screens/log/LogScreen';
import { ProgressScreen } from '../screens/progress/ProgressScreen';
import { SessionEditScreen } from '../screens/plan/SessionEditScreen';
import { RaceSetupScreen } from '../screens/plan/RaceSetupScreen';
import { RacesScreen } from '../screens/plan/RacesScreen';
import { ProfileScreen } from '../screens/progress/ProfileScreen';
import { ZonesScreen } from '../screens/progress/ZonesScreen';
import { ReadinessScreen } from '../screens/log/ReadinessScreen';
import { InjuriesScreen } from '../screens/log/InjuriesScreen';
import { ShoesScreen } from '../screens/progress/ShoesScreen';
import { PhysiqueScreen } from '../screens/progress/PhysiqueScreen';
import { SettingsScreen } from '../screens/progress/SettingsScreen';
import { IntegrationsScreen } from '../screens/progress/IntegrationsScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

const ICONS: Record<TabName, keyof typeof Ionicons.glyphMap> = {
  TodayTab: 'today-outline',
  PlanTab: 'calendar-outline',
  LogTab: 'list-outline',
  ProgressTab: 'stats-chart-outline',
};

const TAB_LABEL: Record<TabName, string> = {
  TodayTab: 'Today',
  PlanTab: 'Plan',
  LogTab: 'Log',
  ProgressTab: 'Progress',
};

// Detail screens registered inside every tab stack, so navigating to them keeps that tab's
// context and the bottom tab bar. Returns fresh elements per call (one instance per stack).
function detailScreens() {
  return [
    <Stack.Screen key="SessionEdit" name="SessionEdit" component={SessionEditScreen} options={{ title: 'Session' }} />,
    <Stack.Screen key="RaceSetup" name="RaceSetup" component={RaceSetupScreen} options={{ title: 'Race & Plan' }} />,
    <Stack.Screen key="Races" name="Races" component={RacesScreen} options={{ title: 'Your races' }} />,
    <Stack.Screen key="Profile" name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />,
    <Stack.Screen key="Zones" name="Zones" component={ZonesScreen} options={{ title: 'Training zones' }} />,
    <Stack.Screen key="Readiness" name="Readiness" component={ReadinessScreen} options={{ title: 'Readiness' }} />,
    <Stack.Screen key="Injuries" name="Injuries" component={InjuriesScreen} options={{ title: 'Injury history' }} />,
    <Stack.Screen key="Shoes" name="Shoes" component={ShoesScreen} options={{ title: 'Shoes' }} />,
    <Stack.Screen key="Physique" name="Physique" component={PhysiqueScreen} options={{ title: 'Physique' }} />,
    <Stack.Screen key="Settings" name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />,
    <Stack.Screen key="Integrations" name="Integrations" component={IntegrationsScreen} options={{ title: 'Integrations' }} />,
  ];
}

function useHeaderOptions() {
  const t = useTheme();
  return {
    headerStyle: { backgroundColor: t.colors.surface },
    headerTintColor: t.colors.text,
    headerTitleStyle: { color: t.colors.text },
    headerBackTitle: 'Back',
    contentStyle: { backgroundColor: t.colors.bg },
  } as const;
}

function TodayStack() {
  const header = useHeaderOptions();
  return (
    <Stack.Navigator screenOptions={header}>
      <Stack.Screen name="Today" component={TodayScreen} options={{ headerShown: false }} />
      {detailScreens()}
    </Stack.Navigator>
  );
}
function PlanStack() {
  const header = useHeaderOptions();
  return (
    <Stack.Navigator screenOptions={header}>
      <Stack.Screen name="Plan" component={PlanScreen} options={{ headerShown: false }} />
      {detailScreens()}
    </Stack.Navigator>
  );
}
function LogStack() {
  const header = useHeaderOptions();
  return (
    <Stack.Navigator screenOptions={header}>
      <Stack.Screen name="Log" component={LogScreen} options={{ headerShown: false }} />
      {detailScreens()}
    </Stack.Navigator>
  );
}
function ProgressStack() {
  const header = useHeaderOptions();
  return (
    <Stack.Navigator screenOptions={header}>
      <Stack.Screen name="Progress" component={ProgressScreen} options={{ headerShown: false }} />
      {detailScreens()}
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const t = useTheme();
  const navTheme: NavTheme = {
    ...(t.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(t.dark ? DarkTheme : DefaultTheme).colors,
      background: t.colors.bg,
      card: t.colors.surface,
      text: t.colors.text,
      border: t.colors.border,
      primary: t.colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: t.colors.primary,
          tabBarInactiveTintColor: t.colors.textMuted,
          tabBarStyle: { backgroundColor: t.colors.surface, borderTopColor: t.colors.border },
          tabBarLabel: TAB_LABEL[route.name as TabName],
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONS[route.name as TabName]} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="TodayTab" component={TodayStack} />
        <Tab.Screen name="PlanTab" component={PlanStack} />
        <Tab.Screen name="LogTab" component={LogStack} />
        <Tab.Screen name="ProgressTab" component={ProgressStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
