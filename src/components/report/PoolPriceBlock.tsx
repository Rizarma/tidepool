"use client";

import { formatTokenPrice } from "@/lib/format";

export function PoolPriceBlock({
  priceTokenYPerTokenX,
  inversePrice,
  symbolX,
  symbolY,
  priceUsdX,
}: {
  priceTokenYPerTokenX?: number;
  inversePrice?: number;
  symbolX: string;
  symbolY: string;
  priceUsdX?: number;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-5 space-y-1">
      <p className="text-xl font-bold text-zinc-100">
        1 {symbolX} = {formatTokenPrice(priceTokenYPerTokenX)} {symbolY}
      </p>
      {priceUsdX != null && (
        <p className="text-xs text-zinc-500">
          ≈ ${formatTokenPrice(priceUsdX)} USD
        </p>
      )}
      <p className="text-sm text-zinc-300">
        1 {symbolY} = {formatTokenPrice(inversePrice)} {symbolX}
      </p>
    </div>
  );
}
