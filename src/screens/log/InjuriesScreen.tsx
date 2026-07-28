import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Body, Button, Card, EmptyState, Field, H1, Label, Pill, Row, ScreenScroll } from '../../components/ui';
import { useTheme } from '../../state/ThemeContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useFocusData } from '../../hooks/useFocusData';
import { createInjury, deleteInjury, listInjuries, resolveInjury } from '../../repositories/injuries';
import type { InjuryLog } from '../../models/types';
import { formatShort, todayISO } from '../../domain/dates';

export function InjuriesScreen() {
  const t = useTheme();
  const { confirm, toast } = useFeedback();
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const loader = useCallback(() => listInjuries(), []);
  const { data: injuries, reload } = useFocusData<InjuryLog[]>(loader, []);

  const add = async () => {
    if (!location.trim()) {
      toast('Add a location, e.g. "outer left ankle"');
      return;
    }
    await createInjury({
      location: location.trim(),
      started_date: todayISO(),
      resolved_date: null,
      severity: null,
      status: 'active',
      notes: notes || null,
    });
    setLocation('');
    setNotes('');
    reload();
  };

  const confirmDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Delete entry?',
      message: 'Permanently remove this injury record.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      await deleteInjury(id);
      reload();
    }
  };

  return (
    <ScreenScroll>
      <H1>Injury history</H1>
      <Body muted>A running list of flagged issues so recurring patterns are easy to spot. Active issues drive prehab suggestions.</Body>

      <Card style={{ marginTop: t.spacing(3) }}>
        <Label>Log a new issue</Label>
        <Field value={location} onChangeText={setLocation} placeholder="Location, e.g. outer left ankle" />
        <Field value={notes} onChangeText={setNotes} placeholder="Notes (optional)" multiline />
        <Button title="Add" onPress={add} />
      </Card>

      {injuries.length === 0 ? (
        <EmptyState title="No injuries logged" subtitle="Hopefully it stays that way." />
      ) : (
        injuries.map((i) => (
          <Card key={i.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 16 }}>{i.location}</Text>
              <Pill text={i.status} color={i.status === 'active' ? t.colors.danger : t.colors.success} />
            </Row>
            <Body muted style={{ marginTop: 2 }}>
              Started {formatShort(i.started_date)}
              {i.resolved_date ? ` · resolved ${formatShort(i.resolved_date)}` : ''}
            </Body>
            {i.notes ? <Body muted style={{ marginTop: 2 }}>{i.notes}</Body> : null}
            <Row gap={2} style={{ marginTop: t.spacing(2) }}>
              {i.status === 'active' ? (
                <Button title="Mark resolved" variant="secondary" small onPress={async () => { await resolveInjury(i.id, todayISO()); reload(); }} />
              ) : null}
              <Button title="Delete" variant="danger" small onPress={() => confirmDelete(i.id)} />
            </Row>
          </Card>
        ))
      )}
    </ScreenScroll>
  );
}
