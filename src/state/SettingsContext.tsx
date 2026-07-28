import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, updateSettings } from '../repositories/settings';
import type { Settings } from '../models/types';

interface SettingsContextValue {
  settings: Settings | null;
  loading: boolean;
  update: (patch: Partial<Omit<Settings, 'id'>>) => Promise<void>;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<Omit<Settings, 'id'>>) => {
      await updateSettings(patch);
      setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loading, update, refresh }),
    [settings, loading, update, refresh],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

// Convenience accessors with sensible fallbacks before settings load.
export function useUnits() {
  const { settings } = useSettings();
  return {
    distance: settings?.units_distance ?? 'km',
    weight: settings?.units_weight ?? 'kg',
  } as const;
}
