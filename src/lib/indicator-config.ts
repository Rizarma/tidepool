/**
 * Indicator configuration types and helpers.
 *
 * Global config stored in localStorage. Used by both the UI controls
 * and the API requests to /api/indicators.
 */

export type OhlcvProviderName = "meteora" | "birdeye";

export interface IndicatorConfig {
  timeframes: string[];
  indicators: Array<{ type: string; period: number; enabled?: boolean; multiplier?: number }>;
  provider: OhlcvProviderName;
}

export const DEFAULT_CONFIG: IndicatorConfig = {
  timeframes: ["5m", "1h", "4h"],
  indicators: [
    { type: "sma", period: 20, enabled: true },
    { type: "supertrend", period: 10, multiplier: 3, enabled: false },
  ],
  provider: "meteora",
};

export const AVAILABLE_TIMEFRAMES = ["5m", "30m", "1h", "2h", "4h", "12h", "24h"] as const;

/** Map UI-friendly timeframe names to Birdeye API casing.
 * @deprecated Kept for internal Birdeye provider use only.
 */
export const BIRDEYE_TIMEFRAME_MAP: Record<string, string> = {
  "5m": "5m",
  "30m": "30m",
  "1h": "1H",
  "2h": "2H",
  "4h": "4H",
  "12h": "12H",
  "24h": "24H",
};

/** @deprecated Use the Birdeye provider internally instead. */
export function toBirdeyeTimeframe(tf: string): string {
  return BIRDEYE_TIMEFRAME_MAP[tf] ?? tf;
}

/**
 * Serialize config to URL query params.
 *
 * Format: `type:period` for single-param indicators,
 *         `type:period:multiplier` for indicators with a multiplier (e.g. supertrend)
 */
export function serializeConfig(config: IndicatorConfig): string {
  const tf = config.timeframes.join(",");
  const ind = config.indicators
    .filter((i) => i.enabled !== false)
    .map((i) => {
      if (i.multiplier !== undefined) {
        return `${i.type}:${i.period}:${i.multiplier}`;
      }
      return `${i.type}:${i.period}`;
    })
    .join(",");
  const provider = config.provider ?? "meteora";
  return `timeframes=${encodeURIComponent(tf)}&indicators=${encodeURIComponent(ind)}&provider=${encodeURIComponent(provider)}`;
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
      if (isValidConfig(parsed)) {
        const config = parsed as IndicatorConfig;
        if (needsMigration(config)) {
          const migrated: IndicatorConfig = {
            ...config,
            provider: config.provider ?? "meteora",
            timeframes: config.timeframes.filter((tf) => !OLD_TIMEFRAMES.has(tf)),
          };
          if (migrated.timeframes.length === 0) {
            migrated.timeframes = [...DEFAULT_CONFIG.timeframes];
          }
          console.info("[IndicatorConfig] Migrated stale timeframes/provider to defaults");
          saveConfig(migrated);
          return migrated;
        }
        return config;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_CONFIG;
}

const OLD_TIMEFRAMES = new Set(["1m", "15m", "1d"]);

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
    const multiplier = (ind as Record<string, unknown>).multiplier;
    if (multiplier !== undefined && typeof multiplier !== "number") return false;
  }
  const provider = c.provider;
  if (provider !== undefined && provider !== "meteora" && provider !== "birdeye") {
    return false;
  }
  return true;
}

function needsMigration(config: IndicatorConfig): boolean {
  const hasOldTimeframe = config.timeframes.some((tf) => OLD_TIMEFRAMES.has(tf));
  const hasMissingProvider = !config.provider;
  return hasOldTimeframe || hasMissingProvider;
}
