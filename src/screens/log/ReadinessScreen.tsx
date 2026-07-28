import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Body, Button, Card, Field, H1, Label, Row, ScreenScroll } from '../../components/ui';
import { useTheme } from '../../state/ThemeContext';
import { useFocusData } from '../../hooks/useFocusData';
import { getReadinessForDate, listReadiness, saveReadiness } from '../../repositories/readiness';
import type { ReadinessLog } from '../../models/types';
import { formatShort, todayISO } from '../../domain/dates';
import type { RootStackScreenProps } from '../../navigation/types';

const SCALE_1_5 = [1, 2, 3, 4, 5];
const PAIN_SCALE = [0, 1, 2, 3, 4, 5];

export function ReadinessScreen({ route }: RootStackScreenProps<'Readiness'>) {
  const t = useTheme();
  const date = route.params?.date ?? todayISO();

  const [sleep, setSleep] = useState<number | null>(null);
  const [soreness, setSoreness] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [painLoc, setPainLoc] = useState('');
  const [notes, setNotes] = useState('');

  const loader = useCallback(async () => {
    const today = await getReadinessForDate(date);
    if (today) {
      setSleep(today.sleep_quality);
      setSoreness(today.soreness);
      setPain(today.pain_severity);
      setPainLoc(today.pain_location ?? '');
      setNotes(today.notes ?? '');
    }
    return listReadiness(30);
  }, [date]);

  const { data: history, reload } = useFocusData<ReadinessLog[]>(loader, []);

  const save = async () => {
    await saveReadiness({
      date,
      sleep_quality: sleep,
      soreness,
      pain_severity: pain,
      pain_location: painLoc || null,
      notes: notes || null,
    });
    reload();
  };

  return (
    <ScreenScroll>
      <H1>Readiness</H1>
      <Body muted>{formatShort(date)}</Body>

      <View style={{ height: t.spacing(3) }} />
      <Scale title="Sleep quality" scale={SCALE_1_5} value={sleep} onPick={setSleep} />
      <Scale title="Soreness" scale={SCALE_1_5} value={soreness} onPick={setSoreness} />
      <Scale title="Pain severity" scale={PAIN_SCALE} value={pain} onPick={setPain} danger />

      <Field label="Pain location (optional)" value={painLoc} onChangeText={setPainLoc} placeholder="e.g. outer left ankle" />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />

      <Button title="Save readiness" onPress={save} />

      <View style={{ height: t.spacing(5) }} />
      <Label>Recent</Label>
      {history.map((r) => (
        <Card key={r.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: t.colors.text, fontWeight: '700' }}>{formatShort(r.date)}</Text>
            <Row gap={3}>
              <Body muted>😴 {r.sleep_quality ?? '—'}</Body>
              <Body muted>💪 {r.soreness ?? '—'}</Body>
              <Text style={{ color: (r.pain_severity ?? 0) >= 3 ? t.colors.danger : t.colors.textMuted }}>
                🩹 {r.pain_severity ?? '—'}
              </Text>
            </Row>
          </Row>
          {r.pain_location ? <Body muted style={{ marginTop: 2 }}>{r.pain_location}</Body> : null}
        </Card>
      ))}
    </ScreenScroll>
  );
}

function Scale({
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
    <View style={{ marginBottom: t.spacing(3) }}>
      <Label>{title}</Label>
      <Row gap={2}>
        {scale.map((n) => {
          const active = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onPick(n)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
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
