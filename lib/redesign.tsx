// The redesign switch (TRINKET_SPEC v5). Off by default; each person turns it
// on from Settings → "Try the new design", and the choice is saved on this
// device. Every redesigned screen checks useRedesign() and falls back to the
// current design when it's off, so the beta is unchanged unless someone opts in.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'tk-flag-redesign';

type RedesignContextValue = {
  on: boolean;
  setOn: (value: boolean) => void;
  isLoaded: boolean;
};

const RedesignContext = createContext<RedesignContextValue>({ on: false, setOn: () => {}, isLoaded: true });

export function RedesignProvider({ children }: { children: React.ReactNode }) {
  const [on, setOnState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => { if (active) setOnState(v === '1'); })
      .catch(() => {})                       // unreadable storage → stay off
      .finally(() => { if (active) setIsLoaded(true); });
    return () => { active = false; };
  }, []);

  const setOn = useCallback((value: boolean) => {
    setOnState(value);
    (value ? AsyncStorage.setItem(STORAGE_KEY, '1') : AsyncStorage.removeItem(STORAGE_KEY)).catch(() => {});
  }, []);

  const value = useMemo(() => ({ on, setOn, isLoaded }), [on, setOn, isLoaded]);
  return <RedesignContext.Provider value={value}>{children}</RedesignContext.Provider>;
}

/** Whether the redesigned screens should render. */
export function useRedesign() {
  return useContext(RedesignContext);
}
