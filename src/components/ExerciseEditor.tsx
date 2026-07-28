import React from 'react';
import { View } from 'react-native';
import { Body, Button, Card, Field, Label, Row } from './ui';
import { useTheme } from '../state/ThemeContext';
import type { StrengthExercise, WeightUnit } from '../models/types';

// Editable list of strength exercises (name / sets / reps / weight), reused by both the
// planned-session editor and the logged-session editor.
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
        <View key={i} style={{ marginBottom: t.spacing(2) }}>
          <Row gap={2} style={{ alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field value={e.name} onChangeText={(v) => update(i, { name: v })} placeholder="Exercise" />
            </View>
            <Button title="Remove" variant="secondary" small onPress={() => remove(i)} />
          </Row>
          <Row gap={2}>
            <View style={{ flex: 1 }}>
              <Field label="Sets" value={String(e.sets)} onChangeText={(v) => update(i, { sets: parseInt(v, 10) || 0 })} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Reps" value={String(e.reps)} onChangeText={(v) => update(i, { reps: parseInt(v, 10) || 0 })} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={`Wt (${e.unit})`} value={String(e.weight)} onChangeText={(v) => update(i, { weight: parseFloat(v) || 0 })} keyboardType="decimal-pad" />
            </View>
          </Row>
        </View>
      ))}
      <Button title="+ Add exercise" variant="secondary" small onPress={add} />
    </Card>
  );
}
