/**
 * Global indicator configuration context.
 *
 * Provides reactive access to the user's indicator settings.
 * Persisted to localStorage across sessions.
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { IndicatorConfig } from "@/lib/indicator-config";
import { DEFAULT_CONFIG, saveConfig, loadConfig } from "@/lib/indicator-config";

interface IndicatorConfigContextType {
  config: IndicatorConfig;
  /** Merge partial updates into the current config */
  updateConfig: (partial: Partial<IndicatorConfig>) => void;
  /** Change the period for a specific indicator type */
  setIndicatorPeriod: (type: string, period: number) => void;
  /** Toggle a timeframe on/off */
  toggleTimeframe: (timeframe: string) => void;
  /** Enable or disable an indicator type */
  toggleIndicator: (type: string) => void;
  /** True while restoring from localStorage (first render) */
  isReady: boolean;
}

const IndicatorConfigContext = createContext<IndicatorConfigContextType | null>(null);

export function IndicatorConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<IndicatorConfig>(DEFAULT_CONFIG);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setConfig(loadConfig());
      setIsReady(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const updateConfig = useCallback((partial: Partial<IndicatorConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
  }, []);

  const setIndicatorPeriod = useCallback((type: string, period: number) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        indicators: prev.indicators.map((ind) =>
          ind.type === type ? { ...ind, period } : ind,
        ),
      };
      saveConfig(next);
      return next;
    });
  }, []);

  const toggleTimeframe = useCallback((timeframe: string) => {
    setConfig((prev) => {
      const has = prev.timeframes.includes(timeframe);
      const timeframes = has
        ? prev.timeframes.filter((tf) => tf !== timeframe)
        : [...prev.timeframes, timeframe];
      const next = { ...prev, timeframes };
      saveConfig(next);
      return next;
    });
  }, []);

  const toggleIndicator = useCallback((type: string) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        indicators: prev.indicators.map((ind) =>
          ind.type === type ? { ...ind, enabled: !ind.enabled } : ind,
        ),
      };
      saveConfig(next);
      return next;
    });
  }, []);

  return (
    <IndicatorConfigContext.Provider
      value={{ config, updateConfig, setIndicatorPeriod, toggleTimeframe, toggleIndicator, isReady }}
    >
      {children}
    </IndicatorConfigContext.Provider>
  );
}

export function useIndicatorConfig(): IndicatorConfigContextType {
  const ctx = useContext(IndicatorConfigContext);
  if (!ctx) {
    throw new Error(
      "useIndicatorConfig must be used within IndicatorConfigProvider",
    );
  }
  return ctx;
}
