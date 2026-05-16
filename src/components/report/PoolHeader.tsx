"use client";

import type { PoolReport } from "@/lib/api-types";
import {
  feePct,
  formatTokenPrice,
  formatUsd,
  numberOrDash,
  pctValue,
  shortenAddress,
} from "@/lib/format";
import { CopyButton } from "@/components/CopyButton";

export function PoolHeader({
  pair,
  name,
  priceTokenYPerTokenX,
  inversePrice,
  symbolX,
  symbolY,
  discoverySlot,
}: {
  pair?: PoolReport["pair"];
  name: string;
  priceTokenYPerTokenX?: number;
  inversePrice?: number;
  symbolX: string;
  symbolY: string;
  discoverySlot?: React.ReactNode;
}) {
  const poolAddress = pair?.poolAddress;

  return (
    <div className="p-5 rounded-xl bg-white/[0.03]">
      {/* ─── Identity ─── */}
      <div className="flex items-start gap-3">
        {pair?.tokenX?.imageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pair.tokenX.imageUrl}
              alt={symbolX}
              className="w-10 h-10 rounded-lg shrink-0 object-cover bg-white/[0.05]"
            />
          </>
        )}

        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 text-xl font-bold text-zinc-100">{name}</h1>

            {/* Status */}
            <div
              className={`shrink-0 inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold ${
                pair?.isBlacklisted
                  ? "bg-red-500/10 text-red-300"
                  : "bg-emerald-500/10 text-emerald-300"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  pair?.isBlacklisted ? "bg-red-400" : "bg-emerald-400"
                }`}
              />
              {pair?.isBlacklisted ? "Blacklisted" : "Active"}
            </div>
          </div>

          {/* Address */}
          {poolAddress && (
            <div className="flex items-center gap-1.5">
              {pair?.launchpad && (
                <>
                  <span className="text-xs text-zinc-400">{pair.launchpad}</span>
                  <span className="text-zinc-400 shrink-0">·</span>
                </>
              )}
              <span
                className="font-mono text-xs text-zinc-400"
                title={poolAddress}
              >
                {shortenAddress(poolAddress)}
              </span>
              <CopyButton address={poolAddress} />
            </div>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="mt-2 space-y-0.5">
        <p className="text-base font-semibold text-zinc-100">
          1 {symbolX} = {formatTokenPrice(priceTokenYPerTokenX)} {symbolY}
        </p>
        <p className="text-sm text-zinc-300">
          1 {symbolY} = {formatTokenPrice(inversePrice)} {symbolX}
        </p>
      </div>

      {/* ─── Discovery slot ─── */}
      {discoverySlot && <div className="mt-4">{discoverySlot}</div>}

      {/* ─── Metrics ─── */}
      <div className="mt-4 pt-4 border-t border-white/[0.03] flex flex-wrap gap-x-5 gap-y-2">
        <Metric label="TVL" value={formatUsd(pair?.tvlUsd)} />
        <Metric label="24h Vol" value={formatUsd(pair?.volume24h)} />
        <Metric label="24h Fees" value={formatUsd(pair?.fees24h)} />
        <Metric label="Bin Step" value={numberOrDash(pair?.binStep)} />
        <Metric label="APR" value={pctValue(pair?.apr)} />
        <Metric label="Base Fee" value={feePct(pair?.baseFeePct)} />

      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-xs text-zinc-400">
      {label}{" "}
      <span className="font-semibold tabular-nums text-zinc-200">{value}</span>
    </span>
  );
}
