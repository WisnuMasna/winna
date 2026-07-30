import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Body, Button, Card, EmptyState, H1, Pill, Row, ScreenScroll } from '../../components/ui';
import { ScheduledSessionCard } from '../../components/SessionCard';
import { useTheme } from '../../state/ThemeContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useFocusData } from '../../hooks/useFocusData';
import { getActiveTemplate, listScheduledBetween } from '../../repositories/plan';
import type { PlanTemplate, ScheduledSession } from '../../models/types';
import { addDaysISO, daysBetween, formatDayNum, formatWeekdayShort, isSameISODay, todayISO, weekDates } from '../../domain/dates';
import { RACE_DISTANCE_LABEL } from '../../domain/pace';
import { reshuffleWeek } from '../../services/weekActions';
import type { TabScreenProps } from '../../navigation/types';

interface PlanData {
  template: PlanTemplate | null;
  sessions: ScheduledSession[];
}

export function PlanScreen({ navigation }: TabScreenProps<'Plan'>) {
  const t = useTheme();
  const { toast } = useFeedback();
  const [anchor, setAnchor] = useState(todayISO());
  const dates = weekDates(anchor);

  const loader = useCallback(async (): Promise<PlanData> => {
    const template = await getActiveTemplate();
    const sessions = await listScheduledBetween(dates[0], dates[6]);
    return { template, sessions };
  }, [dates[0], dates[6]]);

  const { data, reload, refresh } = useFocusData<PlanData>(loader, { template: null, sessions: [] });
  const { template, sessions } = data;

  const phaseThisWeek = sessions[0]?.phase;
  const daysToRace = template ? daysBetween(todayISO(), template.race_date) : null;

  const onReshuffle = async () => {
    const res = await reshuffleWeek(anchor);
    reload();
    toast(res.reason);
  };

  if (!template) {
    return (
      <ScreenScroll onRefresh={refresh}>
        <H1>Plan</H1>
        <EmptyState
          title="No plan yet"
          subtitle="Set up your race and winna will generate a periodized hybrid plan you can edit freely."
        />
        <Button title="Set up race & plan" onPress={() => navigation.navigate('RaceSetup', {})} />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll onRefresh={refresh}>
      <Row style={{ justifyContent: 'space-between', marginBottom: t.spacing(2) }}>
        <H1 style={{ marginBottom: 0 }}>Plan</H1>
        <Button title="Races" variant="ghost" small onPress={() => navigation.navigate('Races')} />
      </Row>

      <Card style={{ marginBottom: t.spacing(3) }} onPress={() => navigation.navigate('RaceSetup', { templateId: template.id })}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 16 }}>
              {template.name || RACE_DISTANCE_LABEL[template.race_distance]}
            </Text>
            <Body muted>{RACE_DISTANCE_LABEL[template.race_distance]} · {template.race_date}</Body>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: t.colors.primary, fontWeight: '800', fontSize: 22 }}>
              {daysToRace != null && daysToRace >= 0 ? `${daysToRace}d` : '—'}
            </Text>
            <Body muted>to race · edit ›</Body>
          </View>
        </Row>
      </Card>

      <Row style={{ justifyContent: 'space-between', marginBottom: t.spacing(2) }}>
        <Button title="‹ Prev" variant="secondary" small onPress={() => setAnchor(addDaysISO(anchor, -7))} />
        <Row gap={2}>
          {phaseThisWeek ? <Pill text={phaseThisWeek} color={t.colors.accent} /> : null}
          <Button title="This week" variant="ghost" small onPress={() => setAnchor(todayISO())} />
        </Row>
        <Button title="Next ›" variant="secondary" small onPress={() => setAnchor(addDaysISO(anchor, 7))} />
      </Row>

      {dates.map((date) => {
        const daySessions = sessions.filter((s) => s.date === date);
        const isToday = isSameISODay(date, todayISO());
        return (
          <View key={date} style={{ marginBottom: t.spacing(2) }}>
            <Row style={{ marginBottom: t.spacing(1) }} gap={2}>
              <Text style={{ color: isToday ? t.colors.primary : t.colors.textMuted, fontWeight: '700', fontSize: 13 }}>
                {formatWeekdayShort(date)} {formatDayNum(date)}
              </Text>
              {isToday ? <Pill text="Today" color={t.colors.primary} /> : null}
            </Row>

            {daySessions.length === 0 ? (
              <Pressable onPress={() => navigation.navigate('SessionEdit', { date })}>
                <View
                  style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: t.colors.border,
                    borderRadius: t.radius,
                    padding: t.spacing(3),
                    marginBottom: t.spacing(2),
                  }}
                >
                  <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>Rest — tap to add a session</Text>
                </View>
              </Pressable>
            ) : (
              daySessions.map((s) => (
                <ScheduledSessionCard
                  key={s.id}
                  session={s}
                  onPress={() => navigation.navigate('SessionEdit', { scheduledId: s.id })}
                />
              ))
            )}
          </View>
        );
      })}

      <Button title="↻ Reshuffle this week" variant="secondary" onPress={onReshuffle} />
    </ScreenScroll>
  );
}
