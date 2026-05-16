import type { IndicatorCellView } from "./indicator-view-model";
import { SignalBadge } from "./IndicatorSignalBadge";
import { QualityDot } from "./IndicatorQualityDot";
import { pctValue } from "@/lib/format";

function toneTextClass(tone: string, isUnavailable: boolean): string {
  if (isUnavailable) return "text-zinc-600";
  switch (tone) {
    case "bullish":
      return "text-emerald-300";
    case "bearish":
      return "text-red-300";
    default:
      return "text-zinc-300";
  }
}

function bgClass(tone: string): string {
  switch (tone) {
    case "bullish":
      return "bg-emerald-500/[0.06] rounded-sm";
    case "bearish":
      return "bg-red-500/[0.06] rounded-sm";
    default:
      return "";
  }
}

function DeviationDisplay({ pct }: { pct: number }) {
  if (pct >= 0) {
    return <span className="text-emerald-300">↑ +{pctValue(pct)}</span>;
  }
  return <span className="text-red-300">↓ {pctValue(pct)}</span>;
}

export function IndicatorMatrixCell({
  cell,
  symbolY,
}: {
  cell: IndicatorCellView;
  symbolY: string;
}) {
  const textClass = toneTextClass(cell.tone, cell.isUnavailable);
  const background = bgClass(cell.tone);
  const isApproximated = cell.quality === "approximate";

  return (
    <div className={`${background} px-2 py-2`} aria-label={cell.ariaLabel}>
      {/* Value row */}
      <div className="flex items-center justify-end gap-1.5">
        <QualityDot quality={cell.quality} tooltip={cell.qualityLabel} />
        <span
          className={`text-sm font-semibold font-mono tabular-nums ${textClass}`}
        >
          {isApproximated && (
            <span className="text-amber-400 mr-0.5">~</span>
          )}
          {cell.valueFormatted}
        </span>
        {!cell.isUnavailable && (
          <span className="text-[10px] text-zinc-500">{symbolY}</span>
        )}
      </div>

      {/* Signal / deviation row */}
      {!cell.isUnavailable && (
        <div className={`text-right text-xs font-mono tabular-nums ${textClass} mt-0.5`}>
          {cell.indicator?.type === "sma" && cell.deviationPct != null ? (
            <DeviationDisplay pct={cell.deviationPct} />
          ) : cell.indicator?.type === "supertrend" ? (
            <SignalBadge signal={cell.signal} />
          ) : null}
        </div>
      )}
    </div>
  );
}
