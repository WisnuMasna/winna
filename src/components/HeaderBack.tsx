import React from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../state/ThemeContext';

// Explicit, always-visible back control for pushed detail screens, so there's never any doubt
// about how to get back (the platform default can be inconsistent, especially on web).
export function HeaderBack() {
  const navigation = useNavigation();
  const t = useTheme();
  if (!navigation.canGoBack()) return null;
  return (
    <Pressable
      onPress={() => navigation.goBack()}
      hitSlop={12}
      style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 12 }}
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={26} color={t.colors.primary} />
      <Text style={{ color: t.colors.primary, fontSize: 16 }}>Back</Text>
    </Pressable>
  );
}
