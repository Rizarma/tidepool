"use client";

import { formatTokenPrice } from "@/lib/format";
import { IndicatorsPanel } from "@/components/indicators/IndicatorsPanel";
import { TerminalSection } from "./report-atoms";

export function PriceIndicatorBlock({
  poolAddress,
  priceTokenYPerTokenX,
  inversePrice,
  symbolX,
  symbolY,
}: {
  poolAddress?: string;
  priceTokenYPerTokenX?: number;
  inversePrice?: number;
  symbolX: string;
  symbolY: string;
}) {
  return (
    <TerminalSection title="Price & Indicators">
      {/* Price display zone */}
      <div className="rounded-xl bg-white/[0.03] p-5">
        <p className="text-xl font-bold text-zinc-100">
          1 {symbolX} = {formatTokenPrice(priceTokenYPerTokenX)} {symbolY}
        </p>
        <p className="text-sm text-zinc-300 mt-1">
          1 {symbolY} = {formatTokenPrice(inversePrice)} {symbolX}
        </p>
      </div>

      {/* Chart well placeholder */}
      <div className="h-48 rounded-xl bg-white/[0.02] border border-dashed border-[var(--panel-border)] flex items-center justify-center mt-4">
        <span className="text-sm text-zinc-500">
          Price history chart coming soon
        </span>
      </div>

      {/* Indicators grid */}
      <div className="mt-4">
        <IndicatorsPanel
          poolAddress={poolAddress}
          currentPrice={priceTokenYPerTokenX}
          symbolY={symbolY}
        />
      </div>
    </TerminalSection>
  );
}
