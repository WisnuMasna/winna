import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Load data whenever the screen gains focus (so edits elsewhere show up on return).
 * `loader` MUST be wrapped in useCallback by the caller to avoid a reload loop.
 */
export function useFocusData<T>(
  loader: () => Promise<T>,
  initial: T,
): { data: T; loading: boolean; reload: () => void; refresh: () => Promise<void> } {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    loader()
      .then((d) => {
        if (active) setData(d);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loader]);

  // Awaitable variant for pull-to-refresh, so the spinner can track the actual load.
  const refresh = useCallback(async () => {
    const d = await loader();
    setData(d);
  }, [loader]);

  useFocusEffect(
    useCallback(() => {
      const cleanup = load();
      return cleanup;
    }, [load]),
  );

  return { data, loading, reload: load, refresh };
}
