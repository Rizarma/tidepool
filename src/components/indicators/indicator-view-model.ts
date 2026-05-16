import { formatTokenPrice } from "@/lib/format";
import { getIndicator } from "@/lib/indicators/registry";
import type {
  IndicatorType,
  IndicatorValue,
  PoolIndicators,
} from "@/lib/types";

export interface IndicatorMatrixView {
  timeframes: string[];
  rows: IndicatorMatrixRow[];
}

export interface IndicatorMatrixRow {
  id: string;
  label: string;
  type: IndicatorType;
  period: number;
  multiplier?: number;
  description: string;
  cells: Record<string, IndicatorCellView>;
}

export interface IndicatorCellView {
  timeframe: string;
  indicator?: IndicatorValue;
  valueFormatted: string;
  deviationPct: number | null;
  signal: IndicatorSignal;
  tone: IndicatorTone;
  quality: IndicatorQuality;
  qualityLabel: string;
  ariaLabel: string;
  isDimmed: boolean;
  isUnavailable: boolean;
}

export type IndicatorSignal =
  | "long"
  | "short"
  | "flat"
  | "bullish"
  | "bearish"
  | "neutral"
  | "unavailable";

export type IndicatorTone =
  | "bullish"
  | "bearish"
  | "neutral"
  | "warning"
  | "flat";

export type IndicatorQuality =
  | "full"
  | "partial"
  | "approximate"
  | "insufficient"
  | "unavailable";

export function makeIndicatorId(
  type: IndicatorType,
  period: number,
  multiplier?: number,
): string {
  return `${type}:${period}:${multiplier ?? ""}`;
}

const WEIGHT_MAP: Record<string, string> = {
  "5m": "fast",
  "30m": "fast",
  "1h": "medium",
  "2h": "medium",
  "4h": "heavy",
  "12h": "heavy",
  "24h": "heavy",
};

export function timeframeWeight(tf: string): string {
  return WEIGHT_MAP[tf] ?? "";
}

function buildLabel(type: IndicatorType, period: number, multiplier?: number): string {
  if (type === "supertrend") {
    return `Supertrend(${period}${multiplier ? `,${multiplier}` : ""})`;
  }
  return `SMA(${period})`;
}

function computeDeviation(
  type: IndicatorType,
  value: number | undefined,
  currentPrice: number | undefined,
): number | null {
  if (type !== "sma") return null;
  if (value == null || currentPrice == null) return null;
  if (Number.isNaN(value) || Number.isNaN(currentPrice)) return null;
  if (value === 0) return null;
  return ((currentPrice - value) / value) * 100;
}

function computeSignal(
  type: IndicatorType,
  value: number | undefined,
  trend: "up" | "down" | undefined,
  unreliableReason: string | undefined,
  currentPrice: number | undefined,
): IndicatorSignal {
  if (value == null || Number.isNaN(value)) return "unavailable";

  if (type === "sma") {
    if (currentPrice == null || Number.isNaN(currentPrice)) return "unavailable";
    if (currentPrice > value) return "bullish";
    if (currentPrice < value) return "bearish";
    return "neutral";
  }

  if (type === "supertrend") {
    if (trend === "up") return "long";
    if (trend === "down") return "short";
    if (unreliableReason) return "flat";
    return "neutral";
  }

  return "unavailable";
}

function computeTone(
  type: IndicatorType,
  signal: IndicatorSignal,
  deviation: number | null,
  isUnavailable: boolean,
): IndicatorTone {
  if (isUnavailable) return "neutral";

  if (type === "sma") {
    if (deviation == null) return "neutral";
    if (deviation > 0) return "bullish";
    if (deviation < 0) return "bearish";
    return "neutral";
  }

  if (type === "supertrend") {
    if (signal === "long") return "bullish";
    if (signal === "short") return "bearish";
    if (signal === "flat") return "warning";
    return "neutral";
  }

  return "neutral";
}

function computeQuality(
    indicator: IndicatorValue | undefined,
    hasValue: boolean,
): IndicatorQuality {
  if (!indicator || !hasValue || indicator.dataQuality === "insufficient") {
    return "unavailable";
  }
  if (indicator.isApproximate) return "approximate";
  if (indicator.dataQuality === "partial") return "partial";
  if (indicator.dataQuality === "full" && hasValue) return "full";
  return "unavailable";
}

function qualityLabel(quality: IndicatorQuality): string {
  switch (quality) {
    case "full":
      return "Full data";
    case "partial":
      return "Partial data";
    case "approximate":
      return "Approximate";
    case "insufficient":
      return "Insufficient data";
    case "unavailable":
      return "Unavailable";
  }
}

export function buildIndicatorMatrixView(
  data: PoolIndicators,
  currentPrice?: number,
): IndicatorMatrixView {
  if (!data?.timeframes?.length) {
    return { timeframes: [], rows: [] };
  }

  const timeframes = data.timeframes.map((t) => t.timeframe);

  // Collect all unique indicator ids across all timeframes
  const rowMap = new Map<string, IndicatorMatrixRow>();

  for (const tf of data.timeframes) {
    for (const val of tf.values) {
      const id = makeIndicatorId(val.type, val.period, val.multiplier);
      if (!rowMap.has(id)) {
        const def = getIndicatorOrDefault(val.type);
        rowMap.set(id, {
          id,
          label: buildLabel(val.type, val.period, val.multiplier),
          type: val.type,
          period: val.period,
          multiplier: val.multiplier,
          description: def.description,
          cells: {},
        });
      }
    }
  }

  // Fill cells for each timeframe
  for (const tf of data.timeframes) {
    const presentIds = new Set<string>();

    for (const val of tf.values) {
      const id = makeIndicatorId(val.type, val.period, val.multiplier);
      presentIds.add(id);
      const row = rowMap.get(id)!;
      const hasValue = val.value != null && !Number.isNaN(val.value);
      const deviation = computeDeviation(val.type, val.value, currentPrice);
      const signal = computeSignal(
        val.type,
        val.value,
        val.trend,
        val.unreliableReason,
        currentPrice,
      );
      const quality = computeQuality(val, hasValue);
      const isUnavailable = quality === "unavailable";
      const tone = computeTone(val.type, signal, deviation, isUnavailable);
      const ql = qualityLabel(quality);

      row.cells[tf.timeframe] = {
        timeframe: tf.timeframe,
        indicator: val,
        valueFormatted: hasValue ? formatTokenPrice(val.value) : "—",
        deviationPct: deviation,
        signal,
        tone,
        quality,
        qualityLabel: ql,
        ariaLabel: `${row.label} ${tf.timeframe}: ${hasValue ? formatTokenPrice(val.value) : "unavailable"}, ${ql}`,
        isDimmed: quality === "partial" || quality === "approximate",
        isUnavailable,
      };
    }

    // Mark missing indicators for this timeframe as unavailable
    for (const [id, row] of rowMap) {
      if (!presentIds.has(id)) {
        row.cells[tf.timeframe] = makeUnavailableCell(tf.timeframe, row);
      }
    }
  }

  // Sort rows by type then period
  const rows = Array.from(rowMap.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.period - b.period;
  });

  return { timeframes, rows };
}

function getIndicatorOrDefault(type: IndicatorType): { description: string } {
  try {
    return getIndicator(type);
  } catch {
    return {
      description:
        type === "supertrend" ? "ATR-based trend-following trailing stop" : "Simple Moving Average",
    };
  }
}

function makeUnavailableCell(
  timeframe: string,
  row: IndicatorMatrixRow,
): IndicatorCellView {
  return {
    timeframe,
    valueFormatted: "—",
    deviationPct: null,
    signal: "unavailable",
    tone: "neutral",
    quality: "unavailable",
    qualityLabel: qualityLabel("unavailable"),
    ariaLabel: `${row.label} ${timeframe}: unavailable`,
    isDimmed: false,
    isUnavailable: true,
  };
}
