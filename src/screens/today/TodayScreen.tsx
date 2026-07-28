import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Body, Button, Card, EmptyState, H1, Label, Row, ScreenScroll } from '../../components/ui';
import { FlagBanner } from '../../components/Banner';
import { ScheduledSessionCard } from '../../components/SessionCard';
import { ReadinessCard } from '../../components/ReadinessCard';
import { useTheme } from '../../state/ThemeContext';
import { useFocusData } from '../../hooks/useFocusData';
import { getActiveTemplate, listScheduledBetween, listScheduledForDate, parsePlanned, setScheduledStatus } from '../../repositories/plan';
import { createSession, listSessions, setStrengthForSession } from '../../repositories/sessions';
import { listReadiness } from '../../repositories/readiness';
import { getMetricsForDate } from '../../repositories/dailyMetrics';
import { listActiveInjuries } from '../../repositories/injuries';
import { getSettings } from '../../repositories/settings';
import { getProvider } from '../../providers';
import { collectFlags, computeACWR, Flag } from '../../domain/adjustments';
import { computeTrainingReadiness } from '../../domain/trainingReadiness';
import { mobilitySuggestions } from '../../domain/mobility';
import { daysBetween, formatLong, todayISO, weekDates } from '../../domain/dates';
import { RACE_DISTANCE_LABEL } from '../../domain/pace';
import type { InjuryLog, PlanTemplate, ScheduledSession, TrainingReadiness, WorkoutKind } from '../../models/types';
import type { TabScreenProps } from '../../navigation/types';

interface TodayData {
  template: PlanTemplate | null;
  today: ScheduledSession[];
  injuries: InjuryLog[];
  flags: Flag[];
  readiness: TrainingReadiness;
  showConnectGarmin: boolean;
  adjustSessionId: number | null;
}

const HARD_KINDS = new Set<WorkoutKind>(['tempo', 'threshold', 'vo2max', 'race_pace', 'progression', 'long']);

const EMPTY_READINESS: TrainingReadiness = {
  score: null,
  level: null,
  headline: '…',
  recommendation: '',
  components: [],
  hasDeviceData: false,
};

export function TodayScreen({ navigation }: TabScreenProps<'Today'>) {
  const t = useTheme();
  const iso = todayISO();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const loader = useCallback(async (): Promise<TodayData> => {
    const week = weekDates(iso);
    const [template, today, injuries, readinessLogs, recentSessions, scheduledWeek, settings, metrics] =
      await Promise.all([
        getActiveTemplate(),
        listScheduledForDate(iso),
        listActiveInjuries(),
        listReadiness(14),
        listSessions(60),
        listScheduledBetween(week[0], week[6]),
        getSettings(),
        getMetricsForDate(iso),
      ]);

    const flags = collectFlags({
      readiness: readinessLogs,
      scheduledThisWeek: scheduledWeek,
      recentSessions,
      hrZoneUpdatedAt: settings.hr_zone_updated_at,
    });

    // Training readiness inputs
    const acwr = computeACWR(recentSessions);
    const pastSessions = recentSessions.filter((s) => s.date < iso);
    const recoveryHours = metrics?.recovery_hours ?? (pastSessions[0] ? daysBetween(pastSessions[0].date, iso) * 24 : null);

    const parsedToday = today.map((s) => ({ s, p: parsePlanned(s) }));
    const hard = parsedToday.find((x) => x.s.type === 'run' && x.p.workout_kind && HARD_KINDS.has(x.p.workout_kind));
    const primary = hard ?? parsedToday[0] ?? null;

    const readiness = computeTrainingReadiness({
      acwr,
      hoursSinceLastSession: recoveryHours,
      metrics,
      todayType: primary?.s.type ?? null,
      todayKind: primary?.p.workout_kind ?? null,
      todayLabel: primary?.p.label ?? null,
    });

    const garmin = getProvider('garmin');
    const showConnectGarmin = !!garmin?.supportsDailyMetrics && settings.garmin_connected === 0 && !metrics;
    const easeToday = readiness.level === 'low' || readiness.level === 'poor';
    const adjustSessionId = hard && easeToday ? hard.s.id : null;

    return { template, today, injuries, flags, readiness, showConnectGarmin, adjustSessionId };
  }, [iso]);

  const { data, reload } = useFocusData<TodayData>(loader, {
    template: null,
    today: [],
    injuries: [],
    flags: [],
    readiness: EMPTY_READINESS,
    showConnectGarmin: false,
    adjustSessionId: null,
  });

  const daysToRace = data.template ? daysBetween(iso, data.template.race_date) : null;
  const hasUpcomingRace = data.template != null && daysToRace != null && daysToRace >= 0;
  const visibleFlags = data.flags.filter((f) => !dismissed.has(f.id));

  const TAB_ROUTES = ['TodayTab', 'PlanTab', 'LogTab', 'ProgressTab'];
  const openRoute = (route?: string, params?: Record<string, unknown>) => {
    if (!route) return;
    if (TAB_ROUTES.includes(route)) {
      (navigation.getParent()?.navigate as any)?.(route);
    } else {
      (navigation.navigate as any)(route, params);
    }
  };

  const markDone = async (s: ScheduledSession) => {
    const planned = parsePlanned(s);
    const sessionId = await createSession({
      date: s.date,
      type: s.type,
      source: 'manual',
      duration_s: planned.duration_s ?? null,
      distance_m: planned.distance_m ?? null,
      avg_pace_s_per_km: planned.target_pace_s_per_km ?? null,
      avg_hr: null,
      rpe: null,
      notes: null,
      shoe_id: null,
    });
    if (s.type === 'strength' && planned.exercises) await setStrengthForSession(sessionId, planned.exercises);
    await setScheduledStatus(s.id, 'done', sessionId);
    reload();
  };

  const mob = data.today.flatMap((s) => mobilitySuggestions(s.type, data.injuries, parsePlanned(s).split));

  return (
    <ScreenScroll>
      <H1>Today</H1>
      <Body muted>{formatLong(iso)}</Body>

      {hasUpcomingRace && data.template ? (
        <Card style={{ marginTop: t.spacing(3), backgroundColor: t.colors.surfaceAlt }} onPress={() => openRoute('PlanTab')}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: t.colors.text, fontWeight: '700' }}>
                {data.template.name || RACE_DISTANCE_LABEL[data.template.race_distance]}
              </Text>
              <Body muted>{RACE_DISTANCE_LABEL[data.template.race_distance]} · {data.template.race_date}</Body>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: t.colors.primary, fontWeight: '800', fontSize: 26 }}>{daysToRace}</Text>
              <Body muted>days · view plan ›</Body>
            </View>
          </Row>
        </Card>
      ) : null}

      {!hasUpcomingRace ? (
        <Card style={{ marginTop: t.spacing(3) }} onPress={() => navigation.navigate('RaceSetup', {})}>
          <Label>Get started</Label>
          <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 16, marginBottom: t.spacing(1) }}>
            {data.template ? 'No upcoming race' : 'No race set yet'}
          </Text>
          <Body muted>Set up a race and winna builds a periodized hybrid plan for you. Tap to start ›</Body>
        </Card>
      ) : null}

      {visibleFlags.length > 0 ? (
        <View style={{ marginTop: t.spacing(3) }}>
          {visibleFlags.map((f) => (
            <FlagBanner
              key={f.id}
              flag={f}
              onDismiss={(id) => setDismissed((prev) => new Set(prev).add(id))}
              onPress={(flag) => openRoute(flag.route, flag.routeParams)}
            />
          ))}
        </View>
      ) : null}

      <View style={{ height: t.spacing(3) }} />
      <ReadinessCard
        readiness={data.readiness}
        garminAvailable={data.showConnectGarmin}
        onConnect={() => openRoute('Integrations')}
        onLogFeel={() => navigation.navigate('Readiness', { date: iso })}
        onAdjust={data.adjustSessionId != null ? () => navigation.navigate('SessionEdit', { scheduledId: data.adjustSessionId! }) : undefined}
        adjustLabel="Ease today's session ›"
      />

      <Label>Today's sessions</Label>
      {data.today.length === 0 ? (
        <EmptyState title="Rest day" subtitle="Nothing scheduled. Enjoy it — or add something from the Plan tab." />
      ) : (
        data.today.map((s) => (
          <ScheduledSessionCard
            key={s.id}
            session={s}
            onPress={() => navigation.navigate('SessionEdit', { scheduledId: s.id })}
            right={
              s.status !== 'done' ? (
                <Button title="Done" small onPress={() => markDone(s)} />
              ) : (
                <Text style={{ color: t.colors.success, fontWeight: '700' }}>✓</Text>
              )
            }
          />
        ))
      )}

      {mob.length > 0 ? (
        <Card style={{ backgroundColor: t.colors.surfaceAlt }}>
          <Label>Optional mobility</Label>
          {mob.slice(0, 3).map((b) => (
            <View key={b.id} style={{ marginTop: t.spacing(2) }}>
              <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 14 }}>
                {b.title} · {b.durationMin} min
              </Text>
              <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>{b.items.join(' · ')}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={{ backgroundColor: t.colors.surfaceAlt }}>
        <Label>Weather</Label>
        <Body muted>Weather-aware notes for outdoor sessions are coming in a later update.</Body>
      </Card>
    </ScreenScroll>
  );
}
