import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, Theme } from './theme';
import { useSettings } from './SettingsContext';

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const { settings } = useSettings();

  const theme = useMemo<Theme>(() => {
    const pref = settings?.theme ?? 'system';
    const resolved = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
    return resolved === 'dark' ? darkTheme : lightTheme;
  }, [settings?.theme, system]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
