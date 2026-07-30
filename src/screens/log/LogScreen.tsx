import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { Body, Button, Card, EmptyState, H1, Label, Pill, Row, ScreenScroll, sessionColor } from '../../components/ui';
import { useTheme } from '../../state/ThemeContext';
import { useUnits } from '../../state/SettingsContext';
import { useFocusData } from '../../hooks/useFocusData';
import { listSessions } from '../../repositories/sessions';
import type { Session } from '../../models/types';
import { formatDistance, formatDuration } from '../../domain/units';
import { formatShort, todayISO } from '../../domain/dates';
import type { TabScreenProps } from '../../navigation/types';

export function LogScreen({ navigation }: TabScreenProps<'Log'>) {
  const t = useTheme();
  const units = useUnits();

  const loader = useCallback(() => listSessions(200), []);
  const { data: sessions, refresh } = useFocusData<Session[]>(loader, []);

  return (
    <ScreenScroll onRefresh={refresh}>
      <H1>Log</H1>

      <Row gap={2} style={{ marginBottom: t.spacing(3) }}>
        <View style={{ flex: 1 }}>
          <Button title="+ Log session" onPress={() => navigation.navigate('SessionEdit', { date: todayISO() })} />
        </View>
      </Row>
      <Row gap={2} style={{ marginBottom: t.spacing(4) }}>
        <View style={{ flex: 1 }}>
          <Button title="Readiness" variant="secondary" small onPress={() => navigation.navigate('Readiness')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Injuries" variant="secondary" small onPress={() => navigation.navigate('Injuries')} />
        </View>
      </Row>

      <Label>History</Label>
      {sessions.length === 0 ? (
        <EmptyState title="No sessions logged yet" subtitle="Log manually here, or mark planned sessions done from Today." />
      ) : (
        sessions.map((s) => (
          <Card key={s.id} onPress={() => navigation.navigate('SessionEdit', { sessionId: s.id })} style={{ borderLeftWidth: 4, borderLeftColor: sessionColor(t, s.type) }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: t.colors.text, fontWeight: '700' }}>{formatShort(s.date)}</Text>
              <Row gap={2}>
                <Pill text={s.type} color={sessionColor(t, s.type)} />
                {s.source !== 'manual' ? <Pill text={s.source} color={t.colors.accent} /> : null}
              </Row>
            </Row>
            <Row gap={3} style={{ marginTop: t.spacing(1), flexWrap: 'wrap' }}>
              {s.distance_m ? <Body muted>{formatDistance(s.distance_m, units.distance)}</Body> : null}
              {s.duration_s ? <Body muted>{formatDuration(s.duration_s)}</Body> : null}
              {s.rpe ? <Body muted>RPE {s.rpe}</Body> : null}
              {s.avg_hr ? <Body muted>{s.avg_hr} bpm</Body> : null}
            </Row>
            {s.notes ? <Body muted style={{ marginTop: t.spacing(1) }}>{s.notes}</Body> : null}
          </Card>
        ))
      )}
    </ScreenScroll>
  );
}
