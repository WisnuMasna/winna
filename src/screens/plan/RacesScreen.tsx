import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { Body, Button, Card, EmptyState, H1, Label, Pill, Row, ScreenScroll } from '../../components/ui';
import { useTheme } from '../../state/ThemeContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useFocusData } from '../../hooks/useFocusData';
import { deleteTemplate, listTemplates } from '../../repositories/plan';
import { RACE_DISTANCE_LABEL } from '../../domain/pace';
import { EQUIPMENT_LABEL } from '../../domain/strength';
import { daysBetween, formatShort, todayISO } from '../../domain/dates';
import type { PlanTemplate } from '../../models/types';
import type { RootStackScreenProps } from '../../navigation/types';

export function RacesScreen({ navigation }: RootStackScreenProps<'Races'>) {
  const t = useTheme();
  const { confirm, toast } = useFeedback();

  const loader = useCallback(() => listTemplates(), []);
  const { data: races, reload } = useFocusData<PlanTemplate[]>(loader, []);

  const nameOf = (r: PlanTemplate) => r.name || RACE_DISTANCE_LABEL[r.race_distance];

  const onDelete = async (r: PlanTemplate) => {
    const ok = await confirm({
      title: `Delete ${nameOf(r)}?`,
      message: 'Removes this race and its planned sessions. Logged sessions are kept.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      await deleteTemplate(r.id);
      toast('Race deleted');
      reload();
    }
  };

  return (
    <ScreenScroll>
      <H1>Your races</H1>
      <Body muted>Add several races and chain them so each block builds on the last.</Body>

      <View style={{ height: t.spacing(3) }} />
      <Button title="+ Add a race" onPress={() => navigation.navigate('RaceSetup', {})} />
      <View style={{ height: t.spacing(4) }} />

      {races.length === 0 ? (
        <EmptyState title="No races yet" subtitle="Add your goal race and winna builds a periodized hybrid plan." />
      ) : (
        races.map((r) => {
          const days = daysBetween(todayISO(), r.race_date);
          const chainedFrom = r.chained_from_id ? races.find((x) => x.id === r.chained_from_id) : null;
          return (
            <Card key={r.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 16, flex: 1 }}>{nameOf(r)}</Text>
                <Text style={{ color: days >= 0 ? t.colors.primary : t.colors.textMuted, fontWeight: '800' }}>
                  {days >= 0 ? `${days}d` : 'past'}
                </Text>
              </Row>
              <Body muted style={{ marginTop: 2 }}>
                {RACE_DISTANCE_LABEL[r.race_distance]} · {formatShort(r.race_date)}
              </Body>
              <Row gap={2} style={{ marginTop: t.spacing(2), flexWrap: 'wrap' }}>
                <Pill text={EQUIPMENT_LABEL[r.equipment]} color={t.colors.strength} />
                {chainedFrom ? <Pill text={`after ${nameOf(chainedFrom)}`} color={t.colors.accent} /> : null}
              </Row>
              <Row gap={2} style={{ marginTop: t.spacing(3), flexWrap: 'wrap' }}>
                <Button title="Edit" variant="secondary" small onPress={() => navigation.navigate('RaceSetup', { templateId: r.id })} />
                <Button title="Chain new after" variant="secondary" small onPress={() => navigation.navigate('RaceSetup', { chainAfterId: r.id })} />
                <Button title="Delete" variant="danger" small onPress={() => onDelete(r)} />
              </Row>
            </Card>
          );
        })
      )}
    </ScreenScroll>
  );
}
