import type { IndicatorCellView } from "./indicator-view-model";
import { SignalBadge } from "./IndicatorSignalBadge";
import { QualityDot } from "./IndicatorQualityDot";
import { pctValue } from "@/lib/format";

function toneColorClass(tone: string, isUnavailable: boolean, isDimmed: boolean): string {
  if (isUnavailable) return "text-zinc-600";
  if (isDimmed) return "text-zinc-400";
  switch (tone) {
    case "bullish":
      return "text-emerald-300";
    case "bearish":
      return "text-red-300";
    default:
      return "text-zinc-100";
  }
}

function bgClass(tone: string): string {
  switch (tone) {
    case "bullish":
      return "bg-emerald-500/[0.03] rounded-sm";
    case "bearish":
      return "bg-red-500/[0.03] rounded-sm";
    default:
      return "";
  }
}

export function IndicatorMatrixCell({
  cell,
  symbolY,
}: {
  cell: IndicatorCellView;
  symbolY: string;
}) {
  const textColor = toneColorClass(cell.tone, cell.isUnavailable, cell.isDimmed);
  const background = bgClass(cell.tone);
  const isApproximated = cell.quality === "approximate";

  return (
    <div className={`${background} px-2 py-1.5`} aria-label={cell.ariaLabel}>
        {/* Value line */}
        <div
          className={`text-right text-sm font-semibold font-mono tabular-nums ${textColor} ${
            isApproximated ? "border-b border-dashed border-zinc-600" : ""
          }`}
        >
          {cell.valueFormatted}
          {!cell.isUnavailable && (
            <span className="ml-1 text-xs text-zinc-500">{symbolY}</span>
          )}
        </div>

        {/* Signal line */}
        {!cell.isUnavailable && (
          <div className={`text-right text-xs font-mono tabular-nums ${textColor}`}>
            {cell.indicator?.type === "sma" && cell.deviationPct != null ? (
              cell.deviationPct >= 0 ? (
                `▲ +${pctValue(cell.deviationPct)}`
              ) : (
                `▼ ${pctValue(Math.abs(cell.deviationPct))}`
              )
            ) : cell.indicator?.type === "supertrend" ? (
              <SignalBadge signal={cell.signal} />
            ) : null}
          </div>
        )}

        {/* Quality dot line */}
        <div className="mt-1 flex justify-end">
          <QualityDot quality={cell.quality} tooltip={cell.qualityLabel} />
        </div>
    </div>
  );
}
