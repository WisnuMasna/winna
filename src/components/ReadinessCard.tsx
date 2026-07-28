import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../state/ThemeContext';
import type { Theme } from '../state/theme';
import { Body, Button, Card, Label, Row } from './ui';
import { READINESS_LEVEL_LABEL } from '../domain/trainingReadiness';
import type { ReadinessLevel, TrainingReadiness } from '../models/types';

function levelColor(t: Theme, level: ReadinessLevel | null): string {
  switch (level) {
    case 'prime':
      return t.colors.primary;
    case 'high':
      return t.colors.success;
    case 'moderate':
      return t.colors.info;
    case 'low':
      return t.colors.warn;
    case 'poor':
      return t.colors.danger;
    default:
      return t.colors.textMuted;
  }
}

export function ReadinessCard({
  readiness,
  garminAvailable,
  onConnect,
  onLogFeel,
  onAdjust,
  adjustLabel,
}: {
  readiness: TrainingReadiness;
  garminAvailable: boolean; // Garmin supports metrics but isn't connected yet
  onConnect?: () => void;
  onLogFeel?: () => void;
  onAdjust?: () => void;
  adjustLabel?: string;
}) {
  const t = useTheme();
  const color = levelColor(t, readiness.level);
  const pct = readiness.score != null ? Math.max(0, Math.min(100, readiness.score)) : 0;

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>Training readiness</Label>
        <Text style={{ color: t.colors.textMuted, fontSize: 12 }}>
          {readiness.hasDeviceData ? 'via device' : 'estimated'}
        </Text>
      </Row>

      <Row style={{ alignItems: 'flex-end', marginTop: t.spacing(1) }} gap={3}>
        <Text style={{ color, fontSize: 44, fontWeight: '800', lineHeight: 48 }}>
          {readiness.score != null ? readiness.score : '—'}
        </Text>
        <View style={{ paddingBottom: t.spacing(2) }}>
          <Text style={{ color, fontSize: 16, fontWeight: '700' }}>
            {readiness.level ? READINESS_LEVEL_LABEL[readiness.level] : ''}
          </Text>
          <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>{readiness.headline}</Text>
        </View>
      </Row>

      {/* score bar */}
      <View style={{ height: 8, backgroundColor: t.colors.surfaceAlt, borderRadius: 4, marginTop: t.spacing(2) }}>
        <View style={{ height: 8, width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
      </View>

      <Text style={{ color: t.colors.text, fontSize: 14, marginTop: t.spacing(3), fontWeight: '600' }}>
        {readiness.recommendation}
      </Text>

      {onAdjust ? (
        <View style={{ marginTop: t.spacing(2) }}>
          <Button title={adjustLabel ?? 'Adjust today'} variant="secondary" small onPress={onAdjust} />
        </View>
      ) : null}

      {/* components */}
      <View style={{ marginTop: t.spacing(3) }}>
        {readiness.components.map((c) => (
          <Row key={c.key} style={{ justifyContent: 'space-between', marginTop: t.spacing(1.5) }}>
            <Text style={{ color: t.colors.text, fontSize: 13, fontWeight: '600' }}>{c.label}</Text>
            <Row gap={2}>
              <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>{c.status}</Text>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    c.sub == null ? t.colors.border : c.sub >= 70 ? t.colors.success : c.sub >= 45 ? t.colors.warn : t.colors.danger,
                }}
              />
            </Row>
          </Row>
        ))}
      </View>

      {garminAvailable ? (
        <View style={{ marginTop: t.spacing(3) }}>
          <Body muted style={{ marginBottom: t.spacing(2), fontSize: 13 }}>
            Connect Garmin for sleep, HRV and recovery-based readiness — no daily check-in needed.
          </Body>
          <Button title="Connect Garmin" onPress={onConnect ?? (() => {})} />
        </View>
      ) : null}

      {onLogFeel ? (
        <View style={{ marginTop: t.spacing(2) }}>
          <Button title="Log how you feel instead" variant="ghost" small onPress={onLogFeel} />
        </View>
      ) : null}
    </Card>
  );
}
