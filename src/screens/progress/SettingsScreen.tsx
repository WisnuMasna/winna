import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Body, Button, Card, H1, Label, Row, ScreenScroll, SegmentedControl } from '../../components/ui';
import { useTheme } from '../../state/ThemeContext';
import { useSettings } from '../../state/SettingsContext';
import { useFeedback } from '../../state/FeedbackContext';
import { parseBackup, restoreBackup, serializeBackup } from '../../repositories/backup';
import { EQUIPMENT_LABEL } from '../../domain/strength';
import { todayISO } from '../../domain/dates';
import type { DistanceUnit, Equipment, ThemePref, WeightUnit } from '../../models/types';
import type { RootStackScreenProps } from '../../navigation/types';

export function SettingsScreen({ navigation }: RootStackScreenProps<'Settings'>) {
  const t = useTheme();
  const { settings, update, refresh } = useSettings();
  const { confirm, toast } = useFeedback();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  if (!settings) {
    return (
      <ScreenScroll>
        <Body muted>Loading…</Body>
      </ScreenScroll>
    );
  }

  const onExport = async () => {
    setExporting(true);
    try {
      const json = await serializeBackup();
      const file = new File(Paths.cache, `winna-backup-${todayISO()}.json`);
      file.create({ overwrite: true });
      file.write(json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'winna backup' });
      } else {
        toast('Backup saved to device');
      }
    } catch (e) {
      toast(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const readPickedFile = async (uri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      return res.text();
    }
    return new File(uri).text();
  };

  const onImport = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;

    setImporting(true);
    try {
      const text = await readPickedFile(picked.assets[0].uri);
      const backup = parseBackup(text);
      const when = backup.exportedAt ? new Date(backup.exportedAt).toLocaleString() : 'unknown date';
      const ok = await confirm({
        title: 'Restore this backup?',
        message: `This replaces ALL current data with the backup from ${when}. This can't be undone.`,
        confirmLabel: 'Replace everything',
        destructive: true,
      });
      if (!ok) return;
      const result = await restoreBackup(backup);
      await refresh();
      toast(`Restored ${result.rows} records`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const recalibrateZones = async () => {
    await update({ hr_zone_updated_at: todayISO() });
    toast('Zones marked current');
  };

  return (
    <ScreenScroll>
      <H1>Settings</H1>

      <Card onPress={() => navigation.navigate('Profile')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Label>Profile</Label>
            <Body muted>Age, sex, height, bodyweight — tailors HR zones & strength loads.</Body>
          </View>
          <Body muted>Edit ›</Body>
        </Row>
      </Card>

      <Card>
        <Label>Distance units</Label>
        <SegmentedControl<DistanceUnit>
          options={[
            { label: 'Kilometers', value: 'km' },
            { label: 'Miles', value: 'mi' },
          ]}
          value={settings.units_distance}
          onChange={(v) => update({ units_distance: v })}
        />
      </Card>

      <Card>
        <Label>Weight units</Label>
        <SegmentedControl<WeightUnit>
          options={[
            { label: 'Kilograms', value: 'kg' },
            { label: 'Pounds', value: 'lb' },
          ]}
          value={settings.units_weight}
          onChange={(v) => update({ units_weight: v })}
        />
      </Card>

      <Card>
        <Label>Default strength equipment</Label>
        <SegmentedControl<Equipment>
          options={(['full_gym', 'dumbbell', 'bodyweight'] as Equipment[]).map((e) => ({
            label: EQUIPMENT_LABEL[e],
            value: e,
          }))}
          value={settings.equipment}
          onChange={(v) => update({ equipment: v })}
        />
        <Body muted style={{ marginTop: t.spacing(1), fontSize: 12 }}>
          Pre-selected for new races. You can still override it per race.
        </Body>
      </Card>

      <Card>
        <Label>Appearance</Label>
        <SegmentedControl<ThemePref>
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
          value={settings.theme}
          onChange={(v) => update({ theme: v })}
        />
      </Card>

      <Card>
        <Label>Training zones</Label>
        <Body muted style={{ marginBottom: t.spacing(2) }}>
          {settings.hr_zone_updated_at ? `Last calibrated ${settings.hr_zone_updated_at}.` : 'Not calibrated yet.'}
        </Body>
        <Button title="Mark zones recalibrated" variant="secondary" small onPress={recalibrateZones} />
      </Card>

      <Card>
        <Label>Backup</Label>
        <Body muted style={{ marginBottom: t.spacing(2) }}>
          Export all training data as JSON so it survives a phone switch or reinstall — then import it on your new device.
        </Body>
        <Button title={exporting ? 'Exporting…' : 'Export / share backup'} onPress={onExport} />
        <View style={{ height: t.spacing(2) }} />
        <Button title={importing ? 'Importing…' : 'Import / restore backup'} variant="secondary" onPress={onImport} />
      </Card>

      <Button title="Integrations (Strava / Garmin)" variant="secondary" onPress={() => navigation.navigate('Integrations')} />
      <View style={{ height: t.spacing(2) }} />
      <Button title="Injury history" variant="secondary" onPress={() => navigation.navigate('Injuries')} />
    </ScreenScroll>
  );
}
