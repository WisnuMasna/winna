import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Body, Button, Card, Field, H1, Label, Pill, Row, ScreenScroll, SegmentedControl } from '../../components/ui';
import { DateField } from '../../components/DateField';
import { useTheme } from '../../state/ThemeContext';
import { useSettings } from '../../state/SettingsContext';
import { useFeedback } from '../../state/FeedbackContext';
import type { Equipment, PlanTemplate, RaceDistance } from '../../models/types';
import { getTemplate, listTemplates } from '../../repositories/plan';
import { createRace, editRace } from '../../services/planService';
import { formatGoalTime, goalFromRecentResult, parseGoalTime, RACE_DISTANCE_LABEL, RACE_DISTANCE_METERS } from '../../domain/pace';
import { EQUIPMENT_LABEL } from '../../domain/strength';
import { displayToMeters, metersToDisplay } from '../../domain/units';
import { todayISO, addDaysISO, formatShort } from '../../domain/dates';
import type { RootStackScreenProps } from '../../navigation/types';

const DISTANCES: RaceDistance[] = ['5k', '10k', 'half', 'full', 'ultra'];
const EQUIPMENT: Equipment[] = ['full_gym', 'dumbbell', 'bodyweight'];
const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

export function RaceSetupScreen({ route, navigation }: RootStackScreenProps<'RaceSetup'>) {
  const t = useTheme();
  const { settings } = useSettings();
  const { toast } = useFeedback();
  const distanceUnit = settings?.units_distance ?? 'km';

  const templateId = route.params?.templateId;
  const isEditing = templateId != null;

  const [name, setName] = useState('');
  const [distance, setDistance] = useState<RaceDistance>('half');
  const [raceDate, setRaceDate] = useState(addDaysISO(todayISO(), 84));
  const [goal, setGoal] = useState('1:45:00');
  const [frequency, setFrequency] = useState('5');
  const [baseline, setBaseline] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('full_gym');
  const [longRunDay, setLongRunDay] = useState<number>(6);
  const [chainAfterId, setChainAfterId] = useState<number | null>(route.params?.chainAfterId ?? null);
  const [otherRaces, setOtherRaces] = useState<PlanTemplate[]>([]);
  const [recentDist, setRecentDist] = useState<RaceDistance>('10k');
  const [recentTime, setRecentTime] = useState('');

  const load = useCallback(async () => {
    const all = await listTemplates();
    setOtherRaces(all.filter((r) => r.id !== templateId));

    if (isEditing) {
      const tpl = await getTemplate(templateId);
      if (tpl) {
        setName(tpl.name ?? '');
        setDistance(tpl.race_distance);
        setRaceDate(tpl.race_date);
        setGoal(formatGoalTime(tpl.goal_seconds));
        setFrequency(String(tpl.weekly_frequency));
        setEquipment(tpl.equipment);
        setLongRunDay(tpl.long_run_day ?? 6);
        setChainAfterId(tpl.chained_from_id);
        if (tpl.baseline_weekly_km != null) {
          setBaseline(metersToDisplay(tpl.baseline_weekly_km * 1000, distanceUnit).toFixed(0));
        }
      }
    } else if (settings?.equipment) {
      setEquipment(settings.equipment);
    }
  }, [templateId, isEditing, distanceUnit, settings?.equipment]);

  useEffect(() => {
    load();
  }, [load]);

  const chained = otherRaces.find((r) => r.id === chainAfterId) ?? null;

  const applyRecentResult = () => {
    const seconds = parseGoalTime(recentTime);
    if (seconds == null) {
      toast('Enter the time as h:mm:ss or mm:ss');
      return;
    }
    const estimated = goalFromRecentResult(RACE_DISTANCE_METERS[recentDist], seconds, distance);
    setGoal(formatGoalTime(estimated));
    toast(`Goal set to ${formatGoalTime(estimated)} for your ${RACE_DISTANCE_LABEL[distance]}`);
  };

  const onSave = async () => {
    const goalSeconds = parseGoalTime(goal);
    const freq = parseInt(frequency, 10);
    if (isNaN(freq) || freq < 3 || freq > 7) {
      toast('Training days should be between 3 and 7.');
      return;
    }
    const baselineNum = baseline.trim() ? parseFloat(baseline) : NaN;
    const baselineKm = isNaN(baselineNum) ? null : displayToMeters(baselineNum, distanceUnit) / 1000;

    const input = {
      name: name.trim() || null,
      raceDistance: distance,
      raceDate,
      goalSeconds,
      weeklyFrequency: freq,
      baselineWeeklyKm: baselineKm,
      equipment,
      longRunDay,
      distanceUnit,
      chainAfterId,
    };

    if (isEditing) {
      await editRace(templateId, input);
      toast('Race updated');
    } else {
      await createRace(input);
      toast('Race & plan created');
    }
    navigation.goBack();
  };

  return (
    <ScreenScroll>
      <H1>{isEditing ? 'Edit race' : 'New race'}</H1>
      <Body muted>Everything here is a starting point — edit individual sessions freely afterwards.</Body>

      <View style={{ height: t.spacing(4) }} />
      <Field label="Race name (optional)" value={name} onChangeText={setName} placeholder="e.g. Berlin Marathon" />

      <Label>Event distance</Label>
      <View style={{ marginBottom: t.spacing(3) }}>
        <SegmentedControl
          options={DISTANCES.map((d) => ({
            label: RACE_DISTANCE_LABEL[d].replace(' Marathon', '').replace('Marathon', 'Full'),
            value: d,
          }))}
          value={distance}
          onChange={setDistance}
        />
      </View>

      {otherRaces.length > 0 ? (
        <Card>
          <Label>Build on a previous race</Label>
          <Body muted style={{ marginBottom: t.spacing(2) }}>
            Chain this block to start after another race and carry your built-up fitness forward.
          </Body>
          <Row gap={2} style={{ flexWrap: 'wrap' }}>
            <Button title="Standalone" variant={chainAfterId == null ? 'primary' : 'secondary'} small onPress={() => setChainAfterId(null)} />
            {otherRaces.map((r) => (
              <Button
                key={r.id}
                title={r.name || RACE_DISTANCE_LABEL[r.race_distance]}
                variant={chainAfterId === r.id ? 'primary' : 'secondary'}
                small
                onPress={() => setChainAfterId(r.id)}
              />
            ))}
          </Row>
          {chained ? (
            <Body muted style={{ marginTop: t.spacing(2) }}>
              Starts {formatShort(addDaysISO(chained.race_date, 3))}, ramping from your previous peak volume.
            </Body>
          ) : null}
        </Card>
      ) : null}

      <DateField label="Race date" value={raceDate} onChange={setRaceDate} minimumDate={todayISO()} />
      <Field label="Goal time (h:mm:ss)" value={goal} onChangeText={setGoal} placeholder="1:45:00" />

      <Card style={{ backgroundColor: t.colors.surfaceAlt }}>
        <Label>Not sure of your goal?</Label>
        <Body muted style={{ marginBottom: t.spacing(2) }}>
          Enter a recent race result and winna estimates an equivalent goal for this event.
        </Body>
        <View style={{ marginBottom: t.spacing(2) }}>
          <SegmentedControl
            options={DISTANCES.map((d) => ({
              label: RACE_DISTANCE_LABEL[d].replace(' Marathon', '').replace('Marathon', 'Full'),
              value: d,
            }))}
            value={recentDist}
            onChange={setRecentDist}
          />
        </View>
        <Field label="Recent finish time (h:mm:ss)" value={recentTime} onChangeText={setRecentTime} placeholder="e.g. 48:30" />
        <Button title="Estimate my goal" variant="secondary" small onPress={applyRecentResult} />
      </Card>

      <Field label="Training days / week (3–7)" value={frequency} onChangeText={setFrequency} keyboardType="numeric" />

      <Label>Long run day</Label>
      <Row gap={1} style={{ flexWrap: 'wrap', marginBottom: t.spacing(3) }}>
        {DAYS.map((d) => (
          <Button
            key={d.value}
            title={d.label}
            small
            variant={longRunDay === d.value ? 'primary' : 'secondary'}
            onPress={() => setLongRunDay(d.value)}
          />
        ))}
      </Row>

      <Label>Strength equipment</Label>
      <View style={{ marginBottom: t.spacing(3) }}>
        <SegmentedControl
          options={EQUIPMENT.map((e) => ({ label: EQUIPMENT_LABEL[e], value: e }))}
          value={equipment}
          onChange={setEquipment}
        />
      </View>

      {chainAfterId == null ? (
        <Field
          label={`Current weekly volume (${distanceUnit}) — optional`}
          value={baseline}
          onChangeText={setBaseline}
          keyboardType="decimal-pad"
          placeholder="leave blank for a sensible default"
        />
      ) : (
        <Row gap={2} style={{ marginBottom: t.spacing(3) }}>
          <Pill text="chained" color={t.colors.accent} />
          <Body muted>Start date & starting volume are set automatically from the previous race.</Body>
        </Row>
      )}

      <Button title={isEditing ? 'Save & regenerate' : 'Create plan'} onPress={onSave} />
      <View style={{ height: t.spacing(2) }} />
      <Body muted>This replaces the planned sessions for this race only. Anything you've logged stays.</Body>
    </ScreenScroll>
  );
}
