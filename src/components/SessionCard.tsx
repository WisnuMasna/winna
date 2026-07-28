import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../state/ThemeContext';
import { Card, Pill, Row, sessionColor } from './ui';
import type { PlannedDetails, ScheduledSession } from '../models/types';
import { parsePlanned } from '../repositories/plan';
import { formatDistance, formatPace } from '../domain/units';
import { useUnits } from '../state/SettingsContext';

const TYPE_LABEL: Record<string, string> = {
  run: 'Run',
  strength: 'Strength',
  mobility: 'Mobility',
  rest: 'Rest',
  cross: 'Cross',
};

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  done: 'Done',
  skipped: 'Skipped',
  flagged: 'Flagged',
};

export function ScheduledSessionCard({
  session,
  onPress,
  right,
}: {
  session: ScheduledSession;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const t = useTheme();
  const units = useUnits();
  const planned: PlannedDetails = parsePlanned(session);
  const color = sessionColor(t, session.type);

  return (
    <Card onPress={onPress} style={{ borderLeftWidth: 4, borderLeftColor: color }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={2}>
          <Pill text={TYPE_LABEL[session.type] ?? session.type} color={color} />
          <Pill text={session.phase} color={t.colors.textMuted} />
          {session.status !== 'planned' ? (
            <Pill
              text={STATUS_LABEL[session.status] ?? session.status}
              color={session.status === 'done' ? t.colors.success : t.colors.warn}
            />
          ) : null}
        </Row>
        {right}
      </Row>

      <Text style={{ color: t.colors.text, fontSize: 17, fontWeight: '700', marginTop: t.spacing(2) }}>
        {planned.label ?? TYPE_LABEL[session.type]}
      </Text>

      {planned.intervals ? (
        <Text style={{ color: t.colors.textMuted, fontSize: 14, marginTop: t.spacing(1) }}>{planned.intervals}</Text>
      ) : null}

      <Row gap={3} style={{ marginTop: t.spacing(2), flexWrap: 'wrap' }}>
        {planned.distance_m ? (
          <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>{formatDistance(planned.distance_m, units.distance)}</Text>
        ) : null}
        {planned.target_pace_s_per_km ? (
          <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>{formatPace(planned.target_pace_s_per_km, units.distance)}</Text>
        ) : null}
        {planned.target_hr ? (
          <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>♥ {planned.target_hr}</Text>
        ) : null}
        {planned.exercises ? (
          <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>{planned.exercises.length} exercises</Text>
        ) : null}
      </Row>

      {session.flag_reason ? (
        <Text style={{ color: t.colors.danger, fontSize: 13, marginTop: t.spacing(2), fontWeight: '600' }}>
          ⚠ {session.flag_reason}
        </Text>
      ) : null}
    </Card>
  );
}
