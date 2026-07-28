import React, { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { Body, Button, Card, EmptyState, Field, H1, Label, Row, ScreenScroll } from '../../components/ui';
import { useTheme } from '../../state/ThemeContext';
import { useUnits } from '../../state/SettingsContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useFocusData } from '../../hooks/useFocusData';
import { createPhysique, deletePhysique, listPhysique } from '../../repositories/physique';
import type { PhysiqueEntry } from '../../models/types';
import { displayToKg, formatWeight } from '../../domain/units';
import { formatShort, todayISO } from '../../domain/dates';

export function PhysiqueScreen() {
  const t = useTheme();
  const units = useUnits();
  const { confirm, toast } = useFeedback();
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  const loader = useCallback(() => listPhysique(120), []);
  const { data: entries, reload } = useFocusData<PhysiqueEntry[]>(loader, []);

  const add = async () => {
    const w = weight.trim() ? displayToKg(parseFloat(weight), units.weight) : null;
    if (w == null && !notes.trim()) {
      toast('Add a bodyweight or a note');
      return;
    }
    await createPhysique({ date: todayISO(), bodyweight: w, unit: units.weight, photo_uri: null, notes: notes || null });
    setWeight('');
    setNotes('');
    reload();
  };

  const latest = entries.find((e) => e.bodyweight != null);

  return (
    <ScreenScroll>
      <H1>Physique</H1>
      <Body muted>Bodyweight and notes over time. Photos and strength-PR tracking build on this later.</Body>

      {latest ? (
        <Card style={{ marginTop: t.spacing(3) }}>
          <Label>Latest bodyweight</Label>
          <Text style={{ color: t.colors.text, fontSize: 24, fontWeight: '800' }}>
            {formatWeight(latest.bodyweight, units.weight)}
          </Text>
          <Body muted>{formatShort(latest.date)}</Body>
        </Card>
      ) : null}

      <Card>
        <Label>Add entry</Label>
        <Field value={weight} onChangeText={setWeight} placeholder={`Bodyweight (${units.weight})`} keyboardType="decimal-pad" />
        <Field value={notes} onChangeText={setNotes} placeholder="Notes (optional)" multiline />
        <Button title="Save entry" onPress={add} />
      </Card>

      {entries.length === 0 ? (
        <EmptyState title="No entries yet" subtitle="Log your first bodyweight to start the trend." />
      ) : (
        entries.map((e) => (
          <Card key={e.id} onPress={async () => {
            const ok = await confirm({ title: 'Delete entry?', message: formatShort(e.date), confirmLabel: 'Delete', destructive: true });
            if (ok) { await deletePhysique(e.id); reload(); }
          }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: t.colors.text, fontWeight: '700' }}>{formatShort(e.date)}</Text>
              <Text style={{ color: t.colors.text }}>{e.bodyweight != null ? formatWeight(e.bodyweight, units.weight) : '—'}</Text>
            </Row>
            {e.notes ? <Body muted style={{ marginTop: 2 }}>{e.notes}</Body> : null}
          </Card>
        ))
      )}
    </ScreenScroll>
  );
}
