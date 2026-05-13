"use client";

import type { PoolReport } from "@/lib/api-types";
import { formatCompactUsd, pctValue, shortenAddress } from "@/lib/format";
import { TerminalSection } from "./report-atoms";

type PoolItem = NonNullable<NonNullable<PoolReport["relatedPools"]>[number]>;

const SENSIBLE_APR_CAP = 1000; // 1000% APR cap for visual bars

function normalizePools(
  pools: PoolItem[],
  currentPair?: PoolReport["pair"],
): PoolItem[] {
  if (!currentPair?.poolAddress) return pools;
  const exists = pools.some((p) => p.poolAddress === currentPair.poolAddress);
  if (exists) return pools;
  return [currentPair, ...pools];
}

interface ComparisonGroupProps {
  title: string;
  pools: PoolItem[];
  currentPoolAddress?: string;
  getValue: (pool: PoolItem) => number | undefined;
  formatValue: (value: number | undefined) => string;
  fixedCap?: number;
}

function ComparisonGroup({
  title,
  pools,
  currentPoolAddress,
  getValue,
  formatValue,
  fixedCap,
}: ComparisonGroupProps) {
  const values = pools.map(getValue);
  const positiveValues = values.filter(
    (v): v is number => v != null && v > 0 && !Number.isNaN(v),
  );
  const maxValue =
    positiveValues.length > 0 ? Math.max(...positiveValues) : 0;
  const scaleMax =
    fixedCap != null && maxValue > 0
      ? Math.min(maxValue, fixedCap)
      : maxValue;

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        {title}
      </h4>
      <div className="space-y-3">
        {pools.map((pool, idx) => {
          const value = getValue(pool);
          const isCurrent = pool.poolAddress === currentPoolAddress;
          const hasValue = value != null && !Number.isNaN(value) && value > 0;
          const barWidth =
            hasValue && scaleMax > 0
              ? `${Math.min((value / scaleMax) * 100, 100)}%`
              : "0%";

          return (
            <div key={pool.poolAddress ?? `pool-${idx}`}>
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs ${
                    isCurrent
                      ? "text-[var(--accent)] font-medium"
                      : "text-zinc-400"
                  }`}
                >
                  {isCurrent
                    ? "Current"
                    : shortenAddress(pool.poolAddress ?? "")}
                </span>
                <span className="text-sm font-medium tabular-nums text-zinc-300">
                  {formatValue(value)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                {hasValue && scaleMax > 0 ? (
                  <div
                    className={`h-full rounded-full ${
                      isCurrent ? "bg-[var(--accent)]" : "bg-zinc-600"
                    }`}
                    style={{ width: barWidth }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ComparisonZone({
  pools,
  currentPoolAddress,
  currentPair,
  pairName,
}: {
  pools: NonNullable<PoolReport["relatedPools"]>;
  currentPoolAddress?: string;
  currentPair?: PoolReport["pair"];
  pairName: string;
}) {
  const normalizedPools = normalizePools(pools, currentPair);

  if (normalizedPools.length === 0) return null;

  return (
    <TerminalSection title={`${pairName} Pool Comparison`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ComparisonGroup
          title="TVL"
          pools={normalizedPools}
          currentPoolAddress={currentPoolAddress}
          getValue={(p) => p.tvlUsd}
          formatValue={formatCompactUsd}
        />
        <ComparisonGroup
          title="24h Volume"
          pools={normalizedPools}
          currentPoolAddress={currentPoolAddress}
          getValue={(p) => p.volume24h}
          formatValue={formatCompactUsd}
        />
        <ComparisonGroup
          title="APR"
          pools={normalizedPools}
          currentPoolAddress={currentPoolAddress}
          getValue={(p) => p.apr}
          formatValue={pctValue}
          fixedCap={SENSIBLE_APR_CAP}
        />
      </div>
    </TerminalSection>
  );
}
