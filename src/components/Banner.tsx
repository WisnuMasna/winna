import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../state/ThemeContext';
import type { Flag } from '../domain/adjustments';

// Dismissible banner for adjustment flags. Purely a nudge — never blocks navigation (spec).
export function FlagBanner({ flag, onDismiss }: { flag: Flag; onDismiss?: (id: string) => void }) {
  const t = useTheme();
  const color =
    flag.severity === 'danger' ? t.colors.danger : flag.severity === 'warn' ? t.colors.warn : t.colors.info;
  return (
    <View
      style={{
        backgroundColor: color + '1A',
        borderLeftWidth: 4,
        borderLeftColor: color,
        borderRadius: t.radius,
        padding: t.spacing(3),
        marginBottom: t.spacing(2),
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: 14, flex: 1 }}>{flag.title}</Text>
        {onDismiss ? (
          <Pressable onPress={() => onDismiss(flag.id)} hitSlop={10}>
            <Text style={{ color: t.colors.textMuted, fontSize: 18, lineHeight: 18 }}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={{ color: t.colors.textMuted, fontSize: 13, marginTop: t.spacing(1) }}>{flag.message}</Text>
      {flag.suggestion ? (
        <Text style={{ color, fontSize: 13, marginTop: t.spacing(1), fontWeight: '600' }}>{flag.suggestion}</Text>
      ) : null}
    </View>
  );
}
