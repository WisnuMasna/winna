import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../state/ThemeContext';
import type { Theme } from '../state/theme';

// Small, theme-aware primitives shared across screens. Everything reads from useTheme()
// so light/dark just works.

export function ScreenScroll({
  children,
  refreshing,
  contentStyle,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      {refreshing ? (
        <View style={{ paddingTop: t.spacing(3) }}>
          <ActivityIndicator color={t.colors.primary} />
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[{ padding: t.spacing(4), paddingBottom: t.spacing(16) }, contentStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing(4),
    marginBottom: t.spacing(3),
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.7 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return (
    <Text style={[{ color: t.colors.text, fontSize: 28, fontWeight: '800', marginBottom: t.spacing(1) }, style]}>
      {children}
    </Text>
  );
}

export function H2({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return (
    <Text style={[{ color: t.colors.text, fontSize: 18, fontWeight: '700', marginBottom: t.spacing(2) }, style]}>
      {children}
    </Text>
  );
}

export function Body({
  children,
  muted,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text style={[{ color: muted ? t.colors.textMuted : t.colors.text, fontSize: 15, lineHeight: 21 }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return (
    <Text
      style={[
        { color: t.colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: t.spacing(1) },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Row({
  children,
  style,
  gap = 2,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: t.spacing(gap) }, style]}>{children}</View>
  );
}

export function Pill({ text, color }: { text: string; color?: string }) {
  const t = useTheme();
  const c = color ?? t.colors.primary;
  return (
    <View style={{ backgroundColor: c + '22', borderRadius: 999, paddingHorizontal: t.spacing(2.5), paddingVertical: t.spacing(1) }}>
      <Text style={{ color: c, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const map: Record<string, { bg: string; fg: string; border: string }> = {
    primary: { bg: t.colors.primary, fg: t.colors.primaryText, border: t.colors.primary },
    secondary: { bg: t.colors.surfaceAlt, fg: t.colors.text, border: t.colors.border },
    ghost: { bg: 'transparent', fg: t.colors.primary, border: 'transparent' },
    danger: { bg: 'transparent', fg: t.colors.danger, border: t.colors.danger },
  };
  const c = map[variant];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: t.radius,
          paddingVertical: small ? t.spacing(2) : t.spacing(3),
          paddingHorizontal: t.spacing(4),
          alignItems: 'center',
        },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      <Text style={{ color: c.fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>{title}</Text>
    </Pressable>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: t.colors.surfaceAlt,
        borderRadius: t.radius,
        padding: 3,
        borderWidth: 1,
        borderColor: t.colors.border,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: t.spacing(2),
              borderRadius: t.radius - 3,
              backgroundColor: active ? t.colors.surface : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: active ? t.colors.text : t.colors.textMuted, fontWeight: '600', fontSize: 13 }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: t.spacing(3) }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        style={{
          color: t.colors.text,
          backgroundColor: t.colors.surface,
          borderWidth: 1,
          borderColor: t.colors.border,
          borderRadius: t.radius,
          paddingHorizontal: t.spacing(3),
          paddingVertical: t.spacing(2.5),
          fontSize: 15,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: t.colors.text, fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: t.colors.textMuted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      {sub ? <Text style={{ color: t.colors.textMuted, fontSize: 11 }}>{sub}</Text> : null}
    </View>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing(2) }} />;
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: t.spacing(8) }}>
      <Text style={{ color: t.colors.text, fontSize: 16, fontWeight: '700', marginBottom: t.spacing(1) }}>{title}</Text>
      {subtitle ? <Body muted style={{ textAlign: 'center' }}>{subtitle}</Body> : null}
    </View>
  );
}

export function sessionColor(theme: Theme, type: string): string {
  switch (type) {
    case 'run':
      return theme.colors.run;
    case 'strength':
      return theme.colors.strength;
    case 'cross':
      return theme.colors.cross;
    case 'mobility':
      return theme.colors.mobility;
    default:
      return theme.colors.rest;
  }
}
