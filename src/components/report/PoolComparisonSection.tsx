"use client";

import { useState } from "react";
import type { PoolReport } from "@/lib/api-types";
import { ComparisonZone } from "@/components/report/ComparisonZone";
import { RankedPoolsTable } from "@/components/report/RelatedPoolsPanel";

type PoolComparisonView = "table" | "chart";

interface PoolComparisonSectionProps {
  pools: NonNullable<PoolReport["relatedPools"]>;
  currentPoolAddress?: string;
  currentPair?: PoolReport["pair"];
  pairName: string;
}

export function PoolComparisonSection({
  pools,
  currentPoolAddress,
  currentPair,
  pairName,
}: PoolComparisonSectionProps) {
  const [view, setView] = useState<PoolComparisonView>("table");

  if (pools.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-400">
          {pools.length} pool{pools.length > 1 ? "s" : ""} available · Compare
          liquidity, volume, and APR
        </p>
        <div
          className="inline-flex w-fit rounded-md border border-[var(--panel-border)] bg-zinc-950/40 p-0.5"
          role="tablist"
          aria-label="Pool comparison view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "table"}
            onClick={() => setView("table")}
            className={`rounded px-3 py-1 text-xs font-medium transition ${
              view === "table"
                ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Table
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "chart"}
            onClick={() => setView("chart")}
            className={`rounded px-3 py-1 text-xs font-medium transition ${
              view === "chart"
                ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Chart
          </button>
        </div>
      </div>

      {view === "table" ? (
        <RankedPoolsTable
          pools={pools}
          currentPoolAddress={currentPoolAddress}
          currentPair={currentPair}
          pairName={pairName}
        />
      ) : (
        <ComparisonZone
          pools={pools}
          currentPoolAddress={currentPoolAddress}
          currentPair={currentPair}
          pairName={pairName}
        />
      )}
    </div>
  );
}
