import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Body, Button, Card, EmptyState, Field, H1, Label, Pill, Row, ScreenScroll } from '../../components/ui';
import { useTheme } from '../../state/ThemeContext';
import { useUnits } from '../../state/SettingsContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useFocusData } from '../../hooks/useFocusData';
import { createShoe, deleteShoe, listShoesWithMileage, ShoeWithMileage, updateShoe } from '../../repositories/shoes';
import { displayToMeters, formatDistance } from '../../domain/units';
import { todayISO } from '../../domain/dates';

export function ShoesScreen() {
  const t = useTheme();
  const units = useUnits();
  const { confirm, toast } = useFeedback();
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState('');

  const loader = useCallback(() => listShoesWithMileage(), []);
  const { data: shoes, reload } = useFocusData<ShoeWithMileage[]>(loader, []);

  const add = async () => {
    if (!name.trim()) {
      toast('Name the shoe, e.g. "Pegasus 41"');
      return;
    }
    const thrKm = threshold.trim()
      ? displayToMeters(parseFloat(threshold), units.distance) / 1000
      : 700;
    await createShoe({ name: name.trim(), purchased_date: todayISO(), threshold_km: thrKm, retired: 0 });
    setName('');
    setThreshold('');
    reload();
  };

  const confirmDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Delete shoe?',
      message: 'Runs stay logged but lose their shoe link.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      await deleteShoe(id);
      reload();
    }
  };

  return (
    <ScreenScroll>
      <H1>Shoes</H1>
      <Body muted>Track mileage per pair and get a nudge when they cross their wear threshold.</Body>

      <Card style={{ marginTop: t.spacing(3) }}>
        <Label>Add a pair</Label>
        <Field value={name} onChangeText={setName} placeholder="Shoe name" />
        <Field value={threshold} onChangeText={setThreshold} placeholder={`Wear threshold (${units.distance}, default 700km)`} keyboardType="decimal-pad" />
        <Button title="Add shoe" onPress={add} />
      </Card>

      {shoes.length === 0 ? (
        <EmptyState title="No shoes yet" subtitle="Add a pair to start tracking mileage." />
      ) : (
        shoes.map((s) => {
          const km = s.total_m / 1000;
          const worn = km >= s.threshold_km;
          const pct = Math.min(1, km / s.threshold_km);
          return (
            <Card key={s.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 16 }}>{s.name}</Text>
                {s.retired ? <Pill text="retired" color={t.colors.textMuted} /> : worn ? <Pill text="replace" color={t.colors.danger} /> : null}
              </Row>
              <Body muted style={{ marginTop: 2 }}>
                {formatDistance(s.total_m, units.distance, 0)} of {formatDistance(s.threshold_km * 1000, units.distance, 0)}
              </Body>
              <View style={{ height: 6, backgroundColor: t.colors.surfaceAlt, borderRadius: 3, marginTop: 6 }}>
                <View style={{ height: 6, width: `${pct * 100}%`, backgroundColor: worn ? t.colors.danger : t.colors.primary, borderRadius: 3 }} />
              </View>
              <Row gap={2} style={{ marginTop: t.spacing(2) }}>
                <Button title={s.retired ? 'Un-retire' : 'Retire'} variant="secondary" small onPress={async () => { await updateShoe(s.id, { retired: s.retired ? 0 : 1 }); reload(); }} />
                <Button title="Delete" variant="danger" small onPress={() => confirmDelete(s.id)} />
              </Row>
            </Card>
          );
        })
      )}
    </ScreenScroll>
  );
}
