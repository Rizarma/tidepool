"use client";

import { useState } from "react";
import type { PoolReport } from "@/lib/api-types";
import { formatCompactUsd, pctCompact, shortenAddress, feePct } from "@/lib/format";
import { TerminalSection } from "./report-atoms";

type PoolItem = NonNullable<NonNullable<PoolReport["relatedPools"]>[number]>;

const SENSIBLE_APR_CAP = 1000; // 1000% APR cap for visual bars
const COLLAPSE_THRESHOLD = 6;

/** LP-friendly pool label: "Bin Step 20 · Fee 0.25%" instead of raw address */
function poolConfigLabel(pool: PoolItem): string {
  const parts: string[] = [];
  if (pool.binStep != null) parts.push(`Bin Step ${pool.binStep}`);
  if (pool.baseFeePct != null) parts.push(`Fee ${feePct(pool.baseFeePct)}`);
  return parts.length > 0 ? parts.join(" · ") : shortenAddress(pool.poolAddress ?? "");
}

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
                    ? `Current · ${poolConfigLabel(pool)}`
                    : poolConfigLabel(pool)}
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
  const [expanded, setExpanded] = useState(false);

  if (normalizedPools.length === 0) return null;

  const shouldCollapse = normalizedPools.length > COLLAPSE_THRESHOLD;
  const isShowing = !shouldCollapse || expanded;

  return (
    <TerminalSection title={`${pairName} Pool Comparison`}>
      {shouldCollapse && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm text-zinc-400">
            {normalizedPools.length} pools available · Comparing by TVL, Volume, APR
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            {expanded ? (
              <>
                <span>▾</span> Collapse
              </>
            ) : (
              <>
                <span>▸</span> Expand comparison
              </>
            )}
          </button>
        </div>
      )}
      {isShowing && (
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
          formatValue={pctCompact}
          fixedCap={SENSIBLE_APR_CAP}
        />
      </div>
      )}
    </TerminalSection>
  );
}
