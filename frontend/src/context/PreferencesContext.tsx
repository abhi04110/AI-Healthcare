import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export interface WorkspacePreferences {
  autoRefreshSeconds: number;
  aiProvider: 'auto' | 'gemini' | 'groq';
  compactDensity: boolean;
  hiddenAdminWidgets: string[];
}

const DEFAULT_PREFS: WorkspacePreferences = {
  autoRefreshSeconds: 15,
  aiProvider: 'auto',
  compactDensity: false,
  hiddenAdminWidgets: [],
};

interface PreferencesContextValue {
  prefs: WorkspacePreferences;
  updatePrefs: (patch: Partial<WorkspacePreferences>) => void;
  toggleAdminWidget: (widgetKey: string) => void;
  resetPrefs: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `medcore_prefs_${user.id}` : 'medcore_prefs_guest';

  const [prefs, setPrefs] = useState<WorkspacePreferences>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
      } else {
        setPrefs(DEFAULT_PREFS);
      }
    } catch {
      setPrefs(DEFAULT_PREFS);
    }
  }, [storageKey]);

  const persist = (next: WorkspacePreferences) => {
    setPrefs(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  };

  const updatePrefs = (patch: Partial<WorkspacePreferences>) => {
    persist({ ...prefs, ...patch });
  };

  const toggleAdminWidget = (widgetKey: string) => {
    const exists = prefs.hiddenAdminWidgets.includes(widgetKey);
    const nextHidden = exists
      ? prefs.hiddenAdminWidgets.filter((k) => k !== widgetKey)
      : [...prefs.hiddenAdminWidgets, widgetKey];
    persist({ ...prefs, hiddenAdminWidgets: nextHidden });
  };

  const resetPrefs = () => persist(DEFAULT_PREFS);

  return (
    <PreferencesContext.Provider value={{ prefs, updatePrefs, toggleAdminWidget, resetPrefs }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}

