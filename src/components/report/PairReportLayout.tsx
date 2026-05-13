"use client";

import { useMemo } from "react";
import type { PoolDiscoveryReport, PoolReport } from "@/lib/api-types";

import { DiscoveryPanel } from "@/components/report/DiscoveryPanel";
import { PoolHeader } from "@/components/report/PoolHeader";
import { ComparisonZone } from "@/components/report/ComparisonZone";
import { PriceIndicatorBlock } from "@/components/report/PriceIndicatorBlock";
import { TokenCard } from "@/components/report/TokenCard";
import { RankedPoolsTable } from "@/components/report/RelatedPoolsPanel";
import { CompactFooter } from "@/components/report/CompactFooter";

export function PairReportLayout({
  report,
  discovery,
  selectedPoolAddress,
  onSelectPool,
  onRunTokenScan,
}: {
  report: PoolReport;
  discovery?: PoolDiscoveryReport;
  selectedPoolAddress?: string | null;
  onSelectPool?: (poolAddress: string) => void;
  onRunTokenScan?: (mint: string) => void;
}) {
  const pair = report.pair;
  const tokenX = pair?.tokenX;
  const tokenY = pair?.tokenY;
  const symbolX = tokenX?.symbol ?? "Token X";
  const symbolY = tokenY?.symbol ?? "Token Y";
  const name = pair?.name ?? `${symbolX} / ${symbolY}`;
  const SOL_MINT = "So11111111111111111111111111111111111111112";
  const gmgnMint = tokenX?.mint === SOL_MINT ? tokenY?.mint : tokenX?.mint;
  const jupiterMint = gmgnMint;
  const jupiterUrl = jupiterMint ? `https://jup.ag/tokens/${jupiterMint}` : null;

  const normalizedPools = useMemo(() => {
    const related = report.relatedPools ?? [];
    const current = report.pair;
    if (!current?.poolAddress) return related;
    const exists = related.some((p) => p.poolAddress === current.poolAddress);
    return exists ? related : [current, ...related];
  }, [report.relatedPools, report.pair]);

  return (
    <div className="min-h-full panel-scroll">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* 1. Pool Header */}
        <PoolHeader
          pair={pair}
          name={name}
          discoverySlot={
            discovery ? (
              <DiscoveryPanel
                variant="compact"
                discovery={discovery}
                selectedPoolAddress={
                  selectedPoolAddress ?? pair?.poolAddress ?? null
                }
                onSelectPool={onSelectPool}
                onRunTokenScan={onRunTokenScan}
              />
            ) : null
          }
        />

        {/* 2. Comparison Zone */}
        {normalizedPools.length > 0 && (
          <ComparisonZone
            pools={normalizedPools}
            currentPoolAddress={pair?.poolAddress}
            currentPair={pair}
            pairName={name}
          />
        )}

        {/* 3. Price & Indicators */}
        <PriceIndicatorBlock
          poolAddress={pair?.poolAddress}
          priceTokenYPerTokenX={pair?.priceTokenYPerTokenX}
          inversePrice={pair?.inversePrice}
          symbolX={symbolX}
          symbolY={symbolY}
        />

        {/* 4. Token Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TokenCard token={tokenX} label="Token X" />
          <TokenCard token={tokenY} label="Token Y" />
        </div>

        {/* 5. Ranked Pools Table */}
        {normalizedPools.length > 0 && (
          <RankedPoolsTable
            pools={normalizedPools}
            currentPoolAddress={pair?.poolAddress}
            currentPair={pair}
            pairName={name}
          />
        )}

        {/* 6. Compact Footer */}
        <CompactFooter
          pair={pair}
          tags={pair?.tags}
          sources={report.sources}
          fetchedAt={report.fetchedAt}
          gmgnMint={gmgnMint}
          jupiterUrl={jupiterUrl}
        />
      </main>
    </div>
  );
}
