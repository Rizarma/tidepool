"use client";

import Link from "next/link";
import type { PoolReport } from "@/lib/api-types";
import {
  shortenAddress,
  numberOrDash,
  feePct,
  formatCompactUsd,
  pctValue,
  formatAge,
} from "@/lib/format";

interface RelatedPoolsPanelProps {
  pools: NonNullable<PoolReport["relatedPools"]>;
  currentPoolAddress?: string;
  pairName?: string;
}

export function RelatedPoolsPanel({
  pools,
  currentPoolAddress,
  pairName,
}: RelatedPoolsPanelProps) {
  if (pools.length === 0) return null;

  const title = pairName ? `${pairName} Pools` : "Related Pools";

  return (
    <div className="mt-3">
      <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
        {title}
      </h3>
      <div className="rounded border border-[var(--panel-border)] bg-[var(--background)] overflow-hidden overflow-x-auto">
        <table className="w-full text-[11px] min-w-[720px]">
          <thead>
            <tr className="border-b border-[var(--panel-border)] text-zinc-500">
              <th className="px-3 py-1.5 text-left font-medium">Pool</th>
              <th className="px-3 py-1.5 text-right font-medium">Bin Step</th>
              <th className="px-3 py-1.5 text-right font-medium">Base Fee</th>
              <th className="px-3 py-1.5 text-right font-medium">TVL</th>
              <th className="px-3 py-1.5 text-right font-medium">24h Vol</th>
              <th className="px-3 py-1.5 text-right font-medium">24h Fees</th>
              <th className="px-3 py-1.5 text-right font-medium">APR</th>
              <th className="px-3 py-1.5 text-right font-medium">Dyn Fee</th>
              <th className="px-3 py-1.5 text-right font-medium">Age</th>
            </tr>
          </thead>
          <tbody>
            {pools.map((pool) => {
              const isCurrent = pool.poolAddress === currentPoolAddress;
              return (
                <tr
                  key={pool.poolAddress ?? "unknown"}
                  className={`border-b border-[var(--panel-border)] last:border-0 transition ${
                    isCurrent
                      ? "bg-[var(--accent)]/5"
                      : "hover:bg-white/[0.03]"
                  }`}
                >
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {pool.poolAddress ? (
                        <Link
                          href={`/pool/${pool.poolAddress}`}
                          className="font-mono text-zinc-400 hover:text-[var(--accent)] transition"
                        >
                          {shortenAddress(pool.poolAddress)}
                        </Link>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                      {isCurrent && (
                        <span className="inline-flex items-center rounded bg-[var(--accent)]/15 px-1 py-0 text-[9px] font-bold uppercase tracking-wider text-[var(--accent)]">
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">
                    {numberOrDash(pool.binStep)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">
                    {feePct(pool.baseFeePct)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">
                    {formatCompactUsd(pool.tvlUsd)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">
                    {formatCompactUsd(pool.volume24h)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">
                    {formatCompactUsd(pool.fees24h)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">
                    {pctValue(pool.apr)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">
                    {feePct(pool.dynamicFeePct)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-400">
                    {formatAge(pool.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[10px] text-zinc-600">
        {pools.length} pool{pools.length > 1 ? "s" : ""} for this pair
      </p>
    </div>
  );
}
