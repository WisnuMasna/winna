import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Body, Button, Card, Field, H1, Label, Row, ScreenScroll, SegmentedControl } from '../../components/ui';
import { useTheme } from '../../state/ThemeContext';
import { useSettings, useUnits } from '../../state/SettingsContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useFocusData } from '../../hooks/useFocusData';
import { getActiveTemplate } from '../../repositories/plan';
import {
  goalPaceSPerKm,
  parseGoalTime,
  normalizeTimeInput,
  formatGoalTime,
  riegelPredict,
  RACE_DISTANCE_LABEL,
  RACE_DISTANCE_METERS,
  trainingPaces,
  TrainingPaces,
} from '../../domain/pace';
import { ageFromBirthYear, estimatedMaxHr, formatHrRange, trainingZones } from '../../domain/hr';
import { formatPace } from '../../domain/units';
import { todayISO } from '../../domain/dates';
import type { PlanTemplate, RaceDistance } from '../../models/types';
import type { RootStackScreenProps } from '../../navigation/types';

const PREDICT_DISTANCES: RaceDistance[] = ['5k', '10k', 'half', 'full'];

const PACE_ROWS: { key: keyof TrainingPaces; name: string }[] = [
  { key: 'recovery', name: 'Recovery' },
  { key: 'easy', name: 'Easy' },
  { key: 'long', name: 'Long run' },
  { key: 'tempo', name: 'Tempo' },
  { key: 'threshold', name: 'Threshold' },
  { key: 'vo2max', name: 'VO2max' },
  { key: 'race_pace', name: 'Race pace' },
];

export function ZonesScreen(_props: RootStackScreenProps<'Zones'>) {
  const t = useTheme();
  const units = useUnits();
  const { settings, update } = useSettings();
  const { toast } = useFeedback();

  const [recentDist, setRecentDist] = useState<RaceDistance>('10k');
  const [recentTime, setRecentTime] = useState('');
  const [predictions, setPredictions] = useState<{ distance: RaceDistance; time: number }[] | null>(null);

  const loader = useCallback(() => getActiveTemplate(), []);
  const { data: template } = useFocusData<PlanTemplate | null>(loader, null);

  const age = settings?.birth_year ? ageFromBirthYear(settings.birth_year) : null;
  const maxHr = age != null ? estimatedMaxHr(age) : null;

  const paces: TrainingPaces | null =
    template && template.goal_seconds != null
      ? trainingPaces(template.race_distance, template.goal_seconds)
      : null;

  const predict = () => {
    const seconds = parseGoalTime(recentTime);
    if (seconds == null) {
      toast('Enter the time as h:mm:ss or mm:ss');
      return;
    }
    const fromM = RACE_DISTANCE_METERS[recentDist];
    setPredictions(
      PREDICT_DISTANCES.map((d) => ({
        distance: d,
        time: Math.round(riegelPredict(fromM, seconds, RACE_DISTANCE_METERS[d])),
      })),
    );
  };

  const markCurrent = async () => {
    await update({ hr_zone_updated_at: todayISO() });
    toast('Zones marked current');
  };

  return (
    <ScreenScroll>
      <H1>Training zones</H1>
      <Body muted>Your heart-rate and pace targets, plus a race-time predictor to keep them honest.</Body>

      {/* HR zones */}
      <Card style={{ marginTop: t.spacing(3) }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Heart-rate zones</Label>
          {maxHr ? <Text style={{ color: t.colors.primary, fontWeight: '800' }}>max ~{maxHr} bpm</Text> : null}
        </Row>
        {maxHr == null ? (
          <Body muted>Add your age in Profile to see HR zones.</Body>
        ) : (
          trainingZones(maxHr).map((z) => (
            <Row key={z.name} style={{ justifyContent: 'space-between', marginTop: t.spacing(2) }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.colors.text, fontWeight: '600' }}>{z.name}</Text>
                <Text style={{ color: t.colors.textMuted, fontSize: 12 }}>{z.note}</Text>
              </View>
              <Text style={{ color: t.colors.text }}>{formatHrRange(z.range)}</Text>
            </Row>
          ))
        )}
      </Card>

      {/* Pace zones */}
      <Card>
        <Label>Pace targets</Label>
        {paces == null ? (
          <Body muted>Set a race with a goal time to see pace targets.</Body>
        ) : (
          <>
            <Body muted style={{ marginBottom: t.spacing(1) }}>
              From your {RACE_DISTANCE_LABEL[template!.race_distance]} goal of {formatGoalTime(template!.goal_seconds)}.
            </Body>
            {PACE_ROWS.map((row) => (
              <Row key={row.key} style={{ justifyContent: 'space-between', marginTop: t.spacing(1.5) }}>
                <Text style={{ color: t.colors.text, fontWeight: '600' }}>{row.name}</Text>
                <Text style={{ color: t.colors.text }}>{formatPace(paces[row.key], units.distance)}</Text>
              </Row>
            ))}
          </>
        )}
      </Card>

      {/* Race predictor */}
      <Card>
        <Label>Race predictor</Label>
        <Body muted style={{ marginBottom: t.spacing(2) }}>
          Enter a recent result to see equivalent times at other distances (Riegel).
        </Body>
        <View style={{ marginBottom: t.spacing(2) }}>
          <SegmentedControl
            options={PREDICT_DISTANCES.map((d) => ({
              label: RACE_DISTANCE_LABEL[d].replace(' Marathon', '').replace('Marathon', 'Full'),
              value: d,
            }))}
            value={recentDist}
            onChange={setRecentDist}
          />
        </View>
        <Field
          label="Recent finish time (type 4830 → 48:30)"
          value={recentTime}
          onChangeText={setRecentTime}
          onBlur={() => setRecentTime(normalizeTimeInput(recentTime))}
          keyboardType="numeric"
          placeholder="e.g. 48:30"
        />
        <Button title="Predict" variant="secondary" small onPress={predict} />

        {predictions ? (
          <View style={{ marginTop: t.spacing(3) }}>
            {predictions.map((p) => (
              <Row key={p.distance} style={{ justifyContent: 'space-between', marginTop: t.spacing(1.5) }}>
                <Text style={{ color: t.colors.text, fontWeight: '600' }}>{RACE_DISTANCE_LABEL[p.distance]}</Text>
                <Row gap={3}>
                  <Text style={{ color: t.colors.text }}>{formatGoalTime(p.time)}</Text>
                  <Text style={{ color: t.colors.textMuted, fontSize: 13 }}>
                    {formatPace(goalPaceSPerKm(p.distance, p.time), units.distance)}
                  </Text>
                </Row>
              </Row>
            ))}
          </View>
        ) : null}
      </Card>

      <Card style={{ backgroundColor: t.colors.surfaceAlt }}>
        <Label>Calibration</Label>
        <Body muted style={{ marginBottom: t.spacing(2) }}>
          {settings?.hr_zone_updated_at ? `Last checked ${settings.hr_zone_updated_at}.` : 'Not calibrated yet.'} Recheck
          after a race or time trial so targets stay accurate.
        </Body>
        <Button title="Mark zones current" variant="secondary" small onPress={markCurrent} />
      </Card>
    </ScreenScroll>
  );
}
