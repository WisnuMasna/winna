import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/db/client';
import { SettingsProvider } from './src/state/SettingsContext';
import { ThemeProvider } from './src/state/ThemeContext';
import { FeedbackProvider } from './src/state/FeedbackContext';
import { RootNavigator } from './src/navigation/RootNavigator';

type BootState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

export default function App() {
  const [boot, setBoot] = useState<BootState>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        setBoot({ status: 'ready' });
      } catch (e) {
        setBoot({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, []);

  if (boot.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D1117' }}>
        <ActivityIndicator color="#4C8DFF" size="large" />
        <Text style={{ color: '#9199A3', marginTop: 16 }}>Starting winna…</Text>
      </View>
    );
  }

  if (boot.status === 'error') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0D1117' }}>
        <Text style={{ color: '#FF6B6B', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Storage unavailable</Text>
        <Text style={{ color: '#9199A3', textAlign: 'center' }}>{boot.message}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <FeedbackProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </FeedbackProvider>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
