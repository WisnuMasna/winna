import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Body, Button, Card, EmptyState, H1, Label, Row, ScreenScroll } from '../../components/ui';
import { FlagBanner } from '../../components/Banner';
import { ScheduledSessionCard } from '../../components/SessionCard';
import { useTheme } from '../../state/ThemeContext';
import { useFocusData } from '../../hooks/useFocusData';
import { getActiveTemplate, listScheduledBetween, listScheduledForDate, parsePlanned, setScheduledStatus } from '../../repositories/plan';
import { createSession, listSessions, setStrengthForSession } from '../../repositories/sessions';
import { getReadinessForDate, listReadiness, saveReadiness } from '../../repositories/readiness';
import { listActiveInjuries } from '../../repositories/injuries';
import { getSettings } from '../../repositories/settings';
import { collectFlags, Flag } from '../../domain/adjustments';
import { mobilitySuggestions } from '../../domain/mobility';
import { addDaysISO, daysBetween, formatLong, todayISO, weekDates } from '../../domain/dates';
import { RACE_DISTANCE_LABEL } from '../../domain/pace';
import type { InjuryLog, PlanTemplate, ReadinessLog, ScheduledSession } from '../../models/types';
import type { TabScreenProps } from '../../navigation/types';

interface TodayData {
  template: PlanTemplate | null;
  today: ScheduledSession[];
  readinessToday: ReadinessLog | null;
  injuries: InjuryLog[];
  flags: Flag[];
}

const SCALE_1_5 = [1, 2, 3, 4, 5];
const PAIN_SCALE = [0, 1, 2, 3, 4, 5];

export function TodayScreen({ navigation }: TabScreenProps<'Today'>) {
  const t = useTheme();
  const iso = todayISO();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const loader = useCallback(async (): Promise<TodayData> => {
    const week = weekDates(iso);
    const [template, today, readinessToday, injuries, readiness, recentSessions, scheduledWeek, settings] =
      await Promise.all([
        getActiveTemplate(),
        listScheduledForDate(iso),
        getReadinessForDate(iso),
        listActiveInjuries(),
        listReadiness(14),
        listSessions(60),
        listScheduledBetween(week[0], week[6]),
        getSettings(),
      ]);
    const flags = collectFlags({
      readiness,
      scheduledThisWeek: scheduledWeek,
      recentSessions,
      hrZoneUpdatedAt: settings.hr_zone_updated_at,
    });
    return { template, today, readinessToday, injuries, flags };
  }, [iso]);

  const { data, reload } = useFocusData<TodayData>(loader, {
    template: null,
    today: [],
    readinessToday: null,
    injuries: [],
    flags: [],
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

  const quickReadiness = async (patch: Partial<ReadinessLog>) => {
    const current = data.readinessToday;
    await saveReadiness({
      date: iso,
      sleep_quality: patch.sleep_quality ?? current?.sleep_quality ?? null,
      soreness: patch.soreness ?? current?.soreness ?? null,
      pain_location: current?.pain_location ?? null,
      pain_severity: patch.pain_severity ?? current?.pain_severity ?? null,
      notes: current?.notes ?? null,
    });
    reload();
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

      {/* Quick readiness — 1 tap each, never a gate */}
      <Card style={{ marginTop: t.spacing(2) }}>
        <Label>Quick check-in</Label>
        <QuickRow
          title="Sleep"
          scale={SCALE_1_5}
          value={data.readinessToday?.sleep_quality ?? null}
          onPick={(v) => quickReadiness({ sleep_quality: v })}
        />
        <QuickRow
          title="Soreness"
          scale={SCALE_1_5}
          value={data.readinessToday?.soreness ?? null}
          onPick={(v) => quickReadiness({ soreness: v })}
        />
        <QuickRow
          title="Pain"
          scale={PAIN_SCALE}
          value={data.readinessToday?.pain_severity ?? null}
          onPick={(v) => quickReadiness({ pain_severity: v })}
          danger
        />
        <Button title="More detail (location, notes)" variant="ghost" small onPress={() => navigation.navigate('Readiness', { date: iso })} />
      </Card>

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

function QuickRow({
  title,
  scale,
  value,
  onPick,
  danger,
}: {
  title: string;
  scale: number[];
  value: number | null;
  onPick: (v: number) => void;
  danger?: boolean;
}) {
  const t = useTheme();
  const activeColor = danger ? t.colors.danger : t.colors.primary;
  return (
    <View style={{ marginTop: t.spacing(2) }}>
      <Text style={{ color: t.colors.textMuted, fontSize: 13, marginBottom: t.spacing(1) }}>{title}</Text>
      <Row gap={2}>
        {scale.map((n) => {
          const active = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onPick(n)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? activeColor : t.colors.surface,
                borderWidth: 1,
                borderColor: active ? activeColor : t.colors.border,
              }}
            >
              <Text style={{ color: active ? t.colors.primaryText : t.colors.text, fontWeight: '700' }}>{n}</Text>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}
