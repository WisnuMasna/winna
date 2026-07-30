import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Body, Button, Card, Field, H1, Label, Row, ScreenScroll, SegmentedControl } from '../../components/ui';
import { useTheme } from '../../state/ThemeContext';
import { useSettings, useUnits } from '../../state/SettingsContext';
import { useFeedback } from '../../state/FeedbackContext';
import { createPhysique, listPhysique } from '../../repositories/physique';
import { ageFromBirthYear, birthYearFromAge, estimatedMaxHr, formatHrRange, trainingZones } from '../../domain/hr';
import { displayToKg, kgToDisplay, sanitizeDecimalInput } from '../../domain/units';
import { todayISO } from '../../domain/dates';
import type { Sex } from '../../models/types';
import type { RootStackScreenProps } from '../../navigation/types';

export function ProfileScreen(_props: RootStackScreenProps<'Profile'>) {
  const t = useTheme();
  const units = useUnits();
  const { settings, update } = useSettings();
  const { toast } = useFeedback();

  const [sex, setSex] = useState<Sex | null>(settings?.sex ?? null);
  const [age, setAge] = useState(settings?.birth_year ? String(ageFromBirthYear(settings.birth_year)) : '');
  const [height, setHeight] = useState(settings?.height_cm != null ? String(settings.height_cm) : '');
  const [weight, setWeight] = useState(
    settings?.bodyweight_kg != null ? kgToDisplay(settings.bodyweight_kg, units.weight).toFixed(1) : '',
  );

  const ageNum = parseInt(age, 10);
  const maxHr = !isNaN(ageNum) && ageNum > 0 ? estimatedMaxHr(ageNum) : null;

  const save = async () => {
    const birthYear = !isNaN(ageNum) && ageNum > 0 ? birthYearFromAge(ageNum) : null;
    const heightCm = height.trim() ? parseFloat(height) : null;
    const bwKg = weight.trim() ? displayToKg(parseFloat(weight), units.weight) : null;

    await update({
      sex,
      birth_year: birthYear,
      height_cm: heightCm,
      bodyweight_kg: bwKg,
      hr_zone_updated_at: birthYear ? todayISO() : settings?.hr_zone_updated_at ?? null,
    });

    // Seed physique tracking with today's bodyweight if it isn't already logged today.
    if (bwKg != null) {
      const recent = await listPhysique(5);
      if (!recent.some((e) => e.date === todayISO())) {
        await createPhysique({ date: todayISO(), bodyweight: bwKg, unit: 'kg', photo_uri: null, notes: 'From profile' });
      }
    }

    toast(birthYear ? 'Profile saved — regenerate a race to apply' : 'Profile saved');
  };

  return (
    <ScreenScroll>
      <H1>Profile</H1>
      <Body muted>
        Used to tailor training: age sets your estimated HR zones, and bodyweight scales default strength loads.
        All optional — pace targets work without it.
      </Body>

      <Card style={{ marginTop: t.spacing(3) }}>
        <Label>Sex</Label>
        <SegmentedControl<Sex>
          options={[
            { label: 'Male', value: 'male' },
            { label: 'Female', value: 'female' },
            { label: 'Other', value: 'other' },
          ]}
          value={sex ?? ('other' as Sex)}
          onChange={setSex}
        />
        <Body muted style={{ marginTop: t.spacing(1), fontSize: 12 }}>
          Captured for your profile; the HR-max estimate itself isn't sex-specific.
        </Body>
      </Card>

      <Row gap={3}>
        <View style={{ flex: 1 }}>
          <Field
            label="Age"
            value={age}
            onChangeText={setAge}
            onBlur={() => {
              const n = parseInt(age, 10);
              if (!isNaN(n)) setAge(String(Math.min(100, Math.max(10, n))));
              else if (age.trim()) setAge('');
            }}
            keyboardType="numeric"
            placeholder="e.g. 32"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Height (cm)" value={height} onChangeText={setHeight} onBlur={() => setHeight(sanitizeDecimalInput(height))} keyboardType="decimal-pad" placeholder="e.g. 178" />
        </View>
      </Row>

      <Field
        label={`Bodyweight (${units.weight})`}
        value={weight}
        onChangeText={setWeight}
        onBlur={() => setWeight(sanitizeDecimalInput(weight))}
        keyboardType="decimal-pad"
        placeholder="e.g. 74"
      />

      <Button title="Save profile" onPress={save} />

      {maxHr ? (
        <Card style={{ marginTop: t.spacing(4) }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Estimated HR zones</Label>
            <Text style={{ color: t.colors.primary, fontWeight: '800' }}>max ~{maxHr} bpm</Text>
          </Row>
          {trainingZones(maxHr).map((z) => (
            <Row key={z.name} style={{ justifyContent: 'space-between', marginTop: t.spacing(2) }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.colors.text, fontWeight: '600' }}>{z.name}</Text>
                <Text style={{ color: t.colors.textMuted, fontSize: 12 }}>{z.note}</Text>
              </View>
              <Text style={{ color: t.colors.text }}>{formatHrRange(z.range)}</Text>
            </Row>
          ))}
          <Body muted style={{ marginTop: t.spacing(2), fontSize: 12 }}>
            Estimate (Tanaka: 208 − 0.7 × age). A field test or lab number is more accurate.
          </Body>
        </Card>
      ) : null}
    </ScreenScroll>
  );
}
