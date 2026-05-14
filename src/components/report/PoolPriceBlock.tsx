"use client";

import { formatTokenPrice } from "@/lib/format";

export function PoolPriceBlock({
  priceTokenYPerTokenX,
  inversePrice,
  symbolX,
  symbolY,
}: {
  priceTokenYPerTokenX?: number;
  inversePrice?: number;
  symbolX: string;
  symbolY: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-5">
      <p className="text-xl font-bold text-zinc-100">
        1 {symbolX} = {formatTokenPrice(priceTokenYPerTokenX)} {symbolY}
      </p>
      <p className="text-sm text-zinc-300 mt-1">
        1 {symbolY} = {formatTokenPrice(inversePrice)} {symbolX}
      </p>
    </div>
  );
}
