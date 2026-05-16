"use client";

import { useMemo } from "react";
import type { PoolDiscoveryReport, PoolReport } from "@/lib/api-types";

import { DiscoveryPanel } from "@/components/report/DiscoveryPanel";
import { PoolHeader } from "@/components/report/PoolHeader";
import { PoolComparisonSection } from "@/components/report/PoolComparisonSection";

import { IndicatorsPanel } from "@/components/indicators/IndicatorsPanel";
import { TerminalSection } from "@/components/report/report-atoms";
import { ExternalLinks } from "@/components/report/ExternalLinks";
import { TokenCard } from "@/components/report/TokenCard";
import { CompactFooter } from "@/components/report/CompactFooter";
import { TokenAnalysisMatrix } from "@/components/report/TokenAnalysisMatrix";

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
    <div className="min-h-full">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* 1. Pool Header + Links (sticky on desktop) */}
        <div className="space-y-3 lg:sticky lg:top-0 lg:z-30 lg:bg-background lg:py-3 lg:border-b lg:border-white/[0.03]">
          <PoolHeader
            pair={pair}
            name={name}
            priceTokenYPerTokenX={pair?.priceTokenYPerTokenX}
            inversePrice={pair?.inversePrice}
            symbolX={symbolX}
            symbolY={symbolY}
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
          <ExternalLinks
            pair={pair}
            gmgnMint={gmgnMint}
            jupiterUrl={jupiterUrl}
          />
        </div>

        {/* 3. On-Chain Analysis */}
        <TokenAnalysisMatrix tokenX={tokenX} tokenY={tokenY} />

        {/* 4. Indicators */}
        {pair?.poolAddress && (
          <TerminalSection title="Indicators">
            <IndicatorsPanel
              poolAddress={pair.poolAddress}
              currentPrice={pair?.priceTokenYPerTokenX}
              symbolY={symbolY}
            />
          </TerminalSection>
        )}

        {/* 5. Pool Comparison */}
        {normalizedPools.length > 0 && (
          <PoolComparisonSection
            pools={normalizedPools}
            currentPoolAddress={pair?.poolAddress}
            currentPair={pair}
            pairName={name}
          />
        )}

        {/* 6. Token Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TokenCard token={tokenX} label="Token X" />
          <TokenCard token={tokenY} label="Token Y" />
        </div>

        {/* 8. Compact Footer */}
        <CompactFooter
          pair={pair}
          tags={pair?.tags}
          sources={report.sources}
          fetchedAt={report.fetchedAt}
        />
      </main>
    </div>
  );
}
