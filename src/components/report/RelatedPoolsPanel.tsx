"use client";

import Link from "next/link";
import type { PoolReport } from "@/lib/api-types";
import { shortenAddress, numberOrDash, feePct, formatUsd } from "@/lib/format";

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

  const title = pairName ? `Other ${pairName} Pools` : "Related Pools";

  return (
    <div className="mt-3">
      <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
        {title}
      </h3>
      <div className="rounded border border-[var(--panel-border)] bg-[var(--background)] overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[var(--panel-border)] text-zinc-500">
              <th className="px-3 py-1.5 text-left font-medium">Pool</th>
              <th className="px-3 py-1.5 text-right font-medium">Bin Step</th>
              <th className="px-3 py-1.5 text-right font-medium">Base Fee</th>
              <th className="px-3 py-1.5 text-right font-medium">TVL</th>
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
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">
                    {numberOrDash(pool.binStep)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">
                    {feePct(pool.baseFeePct)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">
                    {formatUsd(pool.tvlUsd)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[10px] text-zinc-600">
        {pools.length} other pool{pools.length > 1 ? "s" : ""} for this pair
      </p>
    </div>
  );
}
