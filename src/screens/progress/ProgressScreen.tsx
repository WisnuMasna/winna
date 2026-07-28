import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { Body, Button, Card, H1, Label, Row, ScreenScroll, Stat } from '../../components/ui';
import { useTheme } from '../../state/ThemeContext';
import { useUnits } from '../../state/SettingsContext';
import { useFocusData } from '../../hooks/useFocusData';
import { listScheduledBetween } from '../../repositories/plan';
import { listSessions, listSessionsBetween, getStrengthForSession } from '../../repositories/sessions';
import { listReadiness } from '../../repositories/readiness';
import { listShoesWithMileage, ShoeWithMileage } from '../../repositories/shoes';
import { getSettings } from '../../repositories/settings';
import {
  averageReadiness,
  fastestPace,
  loggingStreak,
  longestRunM,
  plannedDistanceM,
  strengthSessionCount,
  totalDistanceM,
} from '../../domain/progress';
import { computeACWR } from '../../domain/adjustments';
import { strengthVolumeKg } from '../../domain/strength';
import { formatDistance, formatPace, formatWeight } from '../../domain/units';
import { hrZoneReminderFlag } from '../../domain/adjustments';
import { todayISO, weekDates } from '../../domain/dates';
import type { ReadinessLog, Session } from '../../models/types';
import type { TabScreenProps } from '../../navigation/types';

interface ProgressData {
  weekActual: number;
  weekPlanned: number;
  strengthCount: number;
  strengthVolume: number;
  acwr: number | null;
  streak: number;
  longest: number;
  fastest: number | null;
  avgSore: number | null;
  avgPain: number | null;
  shoes: ShoeWithMileage[];
  hrZoneStale: boolean;
}

export function ProgressScreen({ navigation }: TabScreenProps<'Progress'>) {
  const t = useTheme();
  const units = useUnits();

  const loader = useCallback(async (): Promise<ProgressData> => {
    const week = weekDates(todayISO());
    const [weekSessions, scheduledWeek, allSessions, readiness, shoes, settings] = await Promise.all([
      listSessionsBetween(week[0], week[6]),
      listScheduledBetween(week[0], week[6]),
      listSessions(400),
      listReadiness(7),
      listShoesWithMileage(),
      getSettings(),
    ]);

    // strength volume for the week
    const strengthWeek = weekSessions.filter((s) => s.type === 'strength');
    let strengthVolume = 0;
    for (const s of strengthWeek) {
      const ex = await getStrengthForSession(s.id);
      strengthVolume += strengthVolumeKg(ex);
    }

    return {
      weekActual: totalDistanceM(weekSessions),
      weekPlanned: plannedDistanceM(scheduledWeek),
      strengthCount: strengthSessionCount(weekSessions),
      strengthVolume,
      acwr: computeACWR(allSessions),
      streak: loggingStreak(allSessions),
      longest: longestRunM(allSessions),
      fastest: fastestPace(allSessions),
      avgSore: averageReadiness(readiness, 'soreness'),
      avgPain: averageReadiness(readiness, 'pain_severity'),
      shoes,
      hrZoneStale: hrZoneReminderFlag(settings.hr_zone_updated_at) !== null,
    };
  }, []);

  const { data } = useFocusData<ProgressData>(loader, {
    weekActual: 0,
    weekPlanned: 0,
    strengthCount: 0,
    strengthVolume: 0,
    acwr: null,
    streak: 0,
    longest: 0,
    fastest: null,
    avgSore: null,
    avgPain: null,
    shoes: [],
    hrZoneStale: false,
  });

  const acwrColor = data.acwr == null ? t.colors.textMuted : data.acwr > 1.5 ? t.colors.danger : data.acwr < 0.8 ? t.colors.warn : t.colors.success;

  return (
    <ScreenScroll>
      <H1>Progress</H1>

      <Card>
        <Label>This week</Label>
        <Row style={{ marginTop: t.spacing(1) }}>
          <Stat label="Mileage" value={formatDistance(data.weekActual, units.distance, 1)} sub={`plan ${formatDistance(data.weekPlanned, units.distance, 0)}`} />
          <Stat label="Strength" value={`${data.strengthCount}`} sub="sessions" />
          <Stat label="Volume" value={data.strengthVolume >= 1000 ? `${(data.strengthVolume / 1000).toFixed(1)}t` : `${Math.round(data.strengthVolume)}kg`} sub="lifted" />
        </Row>
      </Card>

      <Card>
        <Label>Training load & consistency</Label>
        <Row style={{ marginTop: t.spacing(1) }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: acwrColor, fontSize: 22, fontWeight: '800' }}>{data.acwr != null ? data.acwr.toFixed(2) : '—'}</Text>
            <Text style={{ color: t.colors.textMuted, fontSize: 12, fontWeight: '600' }}>ACWR</Text>
            <Text style={{ color: t.colors.textMuted, fontSize: 11 }}>{'>'}1.5 = spike</Text>
          </View>
          <Stat label="Day streak" value={`${data.streak}`} sub="logged" />
          <Stat label="Readiness" value={data.avgPain != null ? `pain ${data.avgPain.toFixed(1)}` : '—'} sub={data.avgSore != null ? `sore ${data.avgSore.toFixed(1)}` : '7-day avg'} />
        </Row>
      </Card>

      <Card>
        <Label>Milestones</Label>
        <Row style={{ marginTop: t.spacing(1) }}>
          <Stat label="Longest run" value={data.longest > 0 ? formatDistance(data.longest, units.distance, 1) : '—'} />
          <Stat label="Fastest pace" value={data.fastest != null ? formatPace(data.fastest, units.distance) : '—'} sub="runs ≥3km" />
        </Row>
      </Card>

      <Card onPress={() => navigation.navigate('Shoes')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Shoes</Label>
          <Body muted>Manage ›</Body>
        </Row>
        {data.shoes.length === 0 ? (
          <Body muted>No shoes tracked yet.</Body>
        ) : (
          data.shoes.slice(0, 3).map((s) => {
            const km = s.total_m / 1000;
            const worn = km >= s.threshold_km;
            const pct = Math.min(1, km / s.threshold_km);
            return (
              <View key={s.id} style={{ marginTop: t.spacing(2) }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: t.colors.text, fontWeight: '600' }}>{s.name}</Text>
                  <Text style={{ color: worn ? t.colors.danger : t.colors.textMuted, fontSize: 13 }}>
                    {formatDistance(s.total_m, units.distance, 0)} / {formatDistance(s.threshold_km * 1000, units.distance, 0)}
                  </Text>
                </Row>
                <View style={{ height: 6, backgroundColor: t.colors.surfaceAlt, borderRadius: 3, marginTop: 4 }}>
                  <View style={{ height: 6, width: `${pct * 100}%`, backgroundColor: worn ? t.colors.danger : t.colors.primary, borderRadius: 3 }} />
                </View>
                {worn ? <Text style={{ color: t.colors.danger, fontSize: 12, marginTop: 2 }}>Past wear threshold — consider replacing.</Text> : null}
              </View>
            );
          })
        )}
      </Card>

      <Card onPress={() => navigation.navigate('Physique')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Physique</Label>
          <Body muted>Track ›</Body>
        </Row>
        <Body muted>Bodyweight & strength PRs — the actual goal is physique maintenance, not just running numbers.</Body>
      </Card>

      {data.hrZoneStale ? (
        <Card style={{ backgroundColor: t.colors.surfaceAlt }} onPress={() => navigation.navigate('Settings')}>
          <Label>Zones</Label>
          <Body muted>Time to reassess your HR/pace zones so training targets stay accurate. Tap to update.</Body>
        </Card>
      ) : null}

      <Button title="Settings & backup" variant="secondary" onPress={() => navigation.navigate('Settings')} />
    </ScreenScroll>
  );
}
