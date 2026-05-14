"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { TIMEFRAMES, type Timeframe } from "@/components/pairs/new-pairs-config";

interface NewPairsPreferences {
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
}

const NewPairsPreferencesContext = createContext<NewPairsPreferences | null>(null);

const LS_TF = "tidepool_timeframe";
const LS_AR = "tidepool_auto_refresh";

export function NewPairsPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [timeframe, setTimeframeState] = useState<Timeframe>("24h");
  const [autoRefresh, setAutoRefreshState] = useState(false);

  // Hydration-safe restore from localStorage
  useEffect(() => {
    Promise.resolve()
      .then(() => {
        try {
          return localStorage.getItem(LS_TF);
        } catch {
          return null;
        }
      })
      .then((val) => {
        if (val && TIMEFRAMES.includes(val as Timeframe)) {
          setTimeframeState(val as Timeframe);
        }
      });

    Promise.resolve()
      .then(() => {
        try {
          return localStorage.getItem(LS_AR);
        } catch {
          return null;
        }
      })
      .then((val) => {
        if (val === "true") setAutoRefreshState(true);
      });
  }, []);

  const setTimeframe = (tf: Timeframe) => {
    setTimeframeState(tf);
    try { localStorage.setItem(LS_TF, tf); } catch { /* ignore */ }
  };

  const setAutoRefresh = (v: boolean) => {
    setAutoRefreshState(v);
    try { localStorage.setItem(LS_AR, String(v)); } catch { /* ignore */ }
  };

  return (
    <NewPairsPreferencesContext.Provider
      value={{ timeframe, setTimeframe, autoRefresh, setAutoRefresh }}
    >
      {children}
    </NewPairsPreferencesContext.Provider>
  );
}

export function useNewPairsPreferences() {
  const ctx = useContext(NewPairsPreferencesContext);
  if (!ctx) {
    throw new Error("useNewPairsPreferences must be used within NewPairsPreferencesProvider");
  }
  return ctx;
}
