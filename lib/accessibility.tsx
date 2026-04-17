import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AccessibilitySettings = {
  largeText: boolean;
  highContrast: boolean;
};

type AccessibilityContextValue = {
  settings: AccessibilitySettings;
  setLargeText: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
  isLoaded: boolean;
};

const STORAGE_KEY = 'trinket.accessibility.settings';

const defaultSettings: AccessibilitySettings = {
  largeText: false,
  highContrast: false,
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || !active) {
          setIsLoaded(true);
          return;
        }
        const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>;
        if (!active) return;
        setSettings({
          largeText: Boolean(parsed.largeText),
          highContrast: Boolean(parsed.highContrast),
        });
        setIsLoaded(true);
      } catch (e) {
        if (active) setIsLoaded(true);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (next: AccessibilitySettings) => {
    setSettings(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      // ignore persistence errors
    }
  }, []);

  const setLargeText = useCallback(
    (value: boolean) => {
      persist({ ...settings, largeText: value });
    },
    [persist, settings]
  );

  const setHighContrast = useCallback(
    (value: boolean) => {
      persist({ ...settings, highContrast: value });
    },
    [persist, settings]
  );

  const value = useMemo(
    () => ({ settings, setLargeText, setHighContrast, isLoaded }),
    [settings, setLargeText, setHighContrast, isLoaded]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibilitySettings() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibilitySettings must be used within AccessibilityProvider');
  return ctx;
}
