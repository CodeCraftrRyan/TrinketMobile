// Load data when a screen comes into focus (and again on every return), with
// loading / failed state and a retry. Ignores results from a stale load.
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

export function useLoader<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const run = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    const mine = ++run.current;
    setFailed(false);
    try {
      const out = await load();
      if (mine === run.current) setData(out);
    } catch (e) {
      console.warn('Load failed', e);
      if (mine === run.current) setFailed(true);
    } finally {
      if (mine === run.current) setLoading(false);
    }
  }, deps);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  return { data, failed, loading, reload };
}
