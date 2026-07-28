import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useTheme } from '../state/ThemeContext';
import { Label } from './ui';
import { formatLong, parseISODate, toISODate } from '../domain/dates';

// A friendly date field: a native calendar picker on iOS/Android, and the browser's native
// date input on web. Value is an ISO date string (YYYY-MM-DD).

// Loaded only on native so the web bundle never pulls the native module.
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: string;
}) {
  const t = useTheme();
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: t.spacing(3) }}>
        {label ? <Label>{label}</Label> : null}
        {React.createElement('input', {
          type: 'date',
          value,
          min: minimumDate,
          onChange: (e: any) => onChange(e.target.value),
          style: {
            backgroundColor: t.colors.surface,
            color: t.colors.text,
            border: `1px solid ${t.colors.border}`,
            borderRadius: t.radius,
            padding: '11px 12px',
            fontSize: 15,
            width: '100%',
            boxSizing: 'border-box',
            colorScheme: t.dark ? 'dark' : 'light',
          },
        })}
      </View>
    );
  }

  return (
    <View style={{ marginBottom: t.spacing(3) }}>
      {label ? <Label>{label}</Label> : null}
      <Pressable
        onPress={() => setShow(true)}
        style={{
          backgroundColor: t.colors.surface,
          borderWidth: 1,
          borderColor: t.colors.border,
          borderRadius: t.radius,
          paddingHorizontal: t.spacing(3),
          paddingVertical: t.spacing(3),
        }}
      >
        <Text style={{ color: t.colors.text, fontSize: 15 }}>{formatLong(value)}</Text>
      </Pressable>
      {show && DateTimePicker ? (
        <DateTimePicker
          value={parseISODate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate ? parseISODate(minimumDate) : undefined}
          onChange={(_event: unknown, selected?: Date) => {
            setShow(false);
            if (selected) onChange(toISODate(selected));
          }}
        />
      ) : null}
    </View>
  );
}
