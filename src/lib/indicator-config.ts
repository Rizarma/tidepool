/**
 * Indicator configuration types and helpers.
 *
 * Global config stored in localStorage. Used by both the UI controls
 * and the API requests to /api/indicators.
 */

export interface IndicatorConfig {
  timeframes: string[];
  indicators: Array<{ type: string; period: number; enabled?: boolean }>;
}

export const DEFAULT_CONFIG: IndicatorConfig = {
  timeframes: ["1m", "5m", "15m"],
  indicators: [{ type: "sma", period: 20, enabled: true }],
};

export const AVAILABLE_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

/** Map UI-friendly timeframe names to Birdeye API casing. */
export const BIRDEYE_TIMEFRAME_MAP: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1H",
  "4h": "4H",
  "1d": "1D",
};

export function toBirdeyeTimeframe(tf: string): string {
  return BIRDEYE_TIMEFRAME_MAP[tf] ?? tf;
}

/**
 * Serialize config to URL query params.
 */
export function serializeConfig(config: IndicatorConfig): string {
  const tf = config.timeframes.join(",");
  const ind = config.indicators
    .filter((i) => i.enabled !== false)
    .map((i) => `${i.type}:${i.period}`)
    .join(",");
  return `timeframes=${encodeURIComponent(tf)}&indicators=${encodeURIComponent(ind)}`;
}

/**
 * Persist config to localStorage.
 */
export function saveConfig(config: IndicatorConfig): void {
  try {
    localStorage.setItem("tidepool_indicator_config", JSON.stringify(config));
  } catch {
    // ignore
  }
}

/**
 * Load config from localStorage, falling back to defaults.
 */
export function loadConfig(): IndicatorConfig {
  try {
    const raw = localStorage.getItem("tidepool_indicator_config");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidConfig(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_CONFIG;
}

function isValidConfig(raw: unknown): raw is IndicatorConfig {
  if (!raw || typeof raw !== "object") return false;
  const c = raw as Record<string, unknown>;
  if (!Array.isArray(c.timeframes)) return false;
  if (!Array.isArray(c.indicators)) return false;
  for (const ind of c.indicators) {
    if (!ind || typeof ind !== "object") return false;
    if (typeof (ind as Record<string, unknown>).type !== "string") return false;
    if (typeof (ind as Record<string, unknown>).period !== "number") return false;
    const enabled = (ind as Record<string, unknown>).enabled;
    if (enabled !== undefined && typeof enabled !== "boolean") return false;
  }
  return true;
}
