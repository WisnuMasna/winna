import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Body, Button, Card, Field, Label, Row } from './ui';
import { useTheme } from '../state/ThemeContext';
import type { StrengthExercise, WeightUnit } from '../models/types';

// Editable list of strength exercises. Sets/reps/weight use −/+ steppers (with typing still
// allowed) so adjusting a set is a tap, not a keyboard trip.
export function ExerciseEditor({
  exercises,
  onChange,
  weightUnit,
}: {
  exercises: StrengthExercise[];
  onChange: (next: StrengthExercise[]) => void;
  weightUnit: WeightUnit;
}) {
  const t = useTheme();

  const update = (i: number, patch: Partial<StrengthExercise>) =>
    onChange(exercises.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const remove = (i: number) => onChange(exercises.filter((_, idx) => idx !== i));
  const add = () => onChange([...exercises, { name: '', sets: 3, reps: 10, weight: 0, unit: weightUnit }]);

  return (
    <Card>
      <Label>Exercises</Label>
      {exercises.length === 0 ? <Body muted>No exercises — add one below.</Body> : null}
      {exercises.map((e, i) => (
        <View key={i} style={{ marginBottom: t.spacing(3) }}>
          <Row gap={2} style={{ alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field value={e.name} onChangeText={(v) => update(i, { name: v })} placeholder="Exercise" />
            </View>
            <Button title="Remove" variant="secondary" small onPress={() => remove(i)} />
          </Row>
          <Row gap={2}>
            <Stepper label="Sets" value={e.sets} step={1} min={1} integer onChange={(v) => update(i, { sets: v })} />
            <Stepper label="Reps" value={e.reps} step={1} min={1} integer onChange={(v) => update(i, { reps: v })} />
            <Stepper label={`Wt (${e.unit})`} value={e.weight} step={2.5} min={0} onChange={(v) => update(i, { weight: v })} />
          </Row>
        </View>
      ))}
      <Button title="+ Add exercise" variant="secondary" small onPress={add} />
    </Card>
  );
}

function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  integer,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step: number;
  min: number;
  integer?: boolean;
}) {
  const t = useTheme();
  const clamp = (n: number) => {
    const rounded = integer ? Math.round(n) : Math.round(n * 100) / 100;
    return Math.max(min, rounded);
  };

  const btn = (symbol: string, delta: number) => (
    <Pressable
      onPress={() => onChange(clamp(value + delta))}
      hitSlop={6}
      style={{ width: 34, alignItems: 'center', justifyContent: 'center', paddingVertical: t.spacing(2) }}
    >
      <Text style={{ color: t.colors.primary, fontSize: 20, fontWeight: '700' }}>{symbol}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <Label>{label}</Label>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: t.colors.surface,
          borderWidth: 1,
          borderColor: t.colors.border,
          borderRadius: t.radius,
        }}
      >
        {btn('−', -step)}
        <TextInput
          value={String(value)}
          onChangeText={(v) => {
            const n = parseFloat(v.replace(/[^0-9.]/g, ''));
            onChange(isNaN(n) ? min : Math.max(min, n));
          }}
          keyboardType="decimal-pad"
          style={{ flex: 1, textAlign: 'center', color: t.colors.text, fontSize: 15, paddingVertical: t.spacing(2) }}
        />
        {btn('+', step)}
      </View>
    </View>
  );
}
