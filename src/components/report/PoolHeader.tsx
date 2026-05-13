"use client";

import type { PoolReport } from "@/lib/api-types";
import {
  feePct,
  formatUsd,
  numberOrDash,
  pctValue,
  shortenAddress,
} from "@/lib/format";
import { CopyButton } from "@/components/CopyButton";

export function PoolHeader({
  pair,
  name,
  discoverySlot,
}: {
  pair?: PoolReport["pair"];
  name: string;
  discoverySlot?: React.ReactNode;
}) {
  const poolAddress = pair?.poolAddress;

  return (
    <div className="p-6 rounded-xl bg-white/[0.03]">
      {/* ─── Identity ─── */}
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-300">
          Meteora DLMM
        </span>

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
            <span
              className="font-mono text-xs text-zinc-500"
              title={poolAddress}
            >
              {shortenAddress(poolAddress)}
            </span>
            <CopyButton address={poolAddress} />
          </div>
        )}
      </div>

      {/* ─── Discovery slot ─── */}
      {discoverySlot && <div className="mt-4">{discoverySlot}</div>}

      {/* ─── Metrics grid ─── */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">
            TVL
          </span>
          <span className="text-lg font-bold tabular-nums text-zinc-100">
            {formatUsd(pair?.tvlUsd)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">
            24h Vol
          </span>
          <span className="text-lg font-bold tabular-nums text-zinc-100">
            {formatUsd(pair?.volume24h)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">
            24h Fees
          </span>
          <span className="text-lg font-bold tabular-nums text-zinc-100">
            {formatUsd(pair?.fees24h)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">
            Bin Step
          </span>
          <span className="text-lg font-bold tabular-nums text-zinc-100">
            {numberOrDash(pair?.binStep)}
          </span>
        </div>
      </div>

      {/* ─── Fee row ─── */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">APR</span>
          <span className="text-sm font-semibold tabular-nums text-zinc-200">
            {pctValue(pair?.apr)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">Base Fee</span>
          <span className="text-sm font-semibold tabular-nums text-zinc-200">
            {feePct(pair?.baseFeePct)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">Dynamic Fee</span>
          <span className="text-sm font-semibold tabular-nums text-zinc-200">
            {feePct(pair?.dynamicFeePct)}
          </span>
        </div>
      </div>
    </div>
  );
}
