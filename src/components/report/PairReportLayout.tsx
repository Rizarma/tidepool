"use client";

import type { PoolDiscoveryReport, PoolReport } from "@/lib/api-types";
import {
  feePct,
  formatTokenPrice,
  formatUsd,
  numberOrDash,
  pctValue,
  shortenAddress,
} from "@/lib/format";
import { SourcesList } from "@/components/report/SourcesList";
import { DataRow, MetricCell, PanelSection, TokenSummaryCompact } from "@/components/report/report-atoms";
import { DiscoveryPanel } from "@/components/report/DiscoveryPanel";
import { RelatedPoolsPanel } from "@/components/report/RelatedPoolsPanel";
import { IndicatorsPanel } from "@/components/indicators/IndicatorsPanel";
import { CopyButton } from "@/components/CopyButton";

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

  return (
    <div className="h-full lg:grid lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr_300px] xl:grid-rows-[1fr]">
      {/* ─── Left Rail: Pool identity + Tokens ─── */}
      <aside className="border-b xl:border-b-0 xl:border-r border-[var(--panel-border)] panel-scroll p-3">
        <div className="mb-3">
          <span className="inline-block rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1.5">
            Meteora DLMM
          </span>
          <p className="text-sm font-semibold text-zinc-100">{name}</p>
          {pair?.poolAddress && (
            <div className="flex items-center gap-1.5 mt-1">
              <p className="font-mono text-[10px] text-zinc-500" title={pair.poolAddress}>
                {shortenAddress(pair.poolAddress)}
              </p>
              <CopyButton address={pair.poolAddress} />
            </div>
          )}
        </div>

        {/* Status */}
        <div className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-semibold ${pair?.isBlacklisted ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          <span className={`size-1.5 rounded-full ${pair?.isBlacklisted ? "bg-red-400" : "bg-emerald-400"}`} />
          {pair?.isBlacklisted ? "Blacklisted" : "Active"}
        </div>

        {/* Token X */}
        <PanelSection title={`Token X — ${symbolX}`} className="mt-4">
          <TokenSummaryCompact token={tokenX} />
        </PanelSection>

        {/* Token Y */}
        <PanelSection title={`Token Y — ${symbolY}`} className="mt-3">
          <TokenSummaryCompact token={tokenY} />
        </PanelSection>

        {/* External Links */}
        {pair?.poolAddress && (
          <PanelSection title="External Links" className="mt-3">
            <div className="flex flex-wrap gap-1.5">
              <a
                href={`https://app.meteora.ag/dlmm/${pair.poolAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1 text-[10px] text-zinc-500 hover:text-[var(--accent)] transition"
              >
                Meteora
              </a>
              {gmgnMint && (
                <a
                  href={`https://gmgn.ai/sol/token/${gmgnMint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1 text-[10px] text-zinc-500 hover:text-[var(--accent)] transition"
                >
                  GMGN
                </a>
              )}
              <a
                href={`https://www.dextools.io/app/en/solana/pair-explorer/${pair.poolAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1 text-[10px] text-zinc-500 hover:text-[var(--accent)] transition"
              >
                DexTools
              </a>
              <a
                href={`https://dexscreener.com/solana/${pair.poolAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1 text-[10px] text-zinc-500 hover:text-[var(--accent)] transition"
              >
                DexScreener
              </a>
              {jupiterUrl && (
                <a
                  href={jupiterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1 text-[10px] text-zinc-500 hover:text-[var(--accent)] transition"
                >
                  Jupiter
                </a>
              )}
            </div>
          </PanelSection>
        )}
      </aside>

      {/* ─── Center: Metrics + Price + Fees ─── */}
      <section className="border-b xl:border-b-0 xl:border-r border-[var(--panel-border)] panel-scroll p-3">
        {discovery && (
          <DiscoveryPanel
            discovery={discovery}
            selectedPoolAddress={selectedPoolAddress ?? pair?.poolAddress ?? null}
            onSelectPool={onSelectPool}
            onRunTokenScan={onRunTokenScan}
          />
        )}

        {/* Key metrics */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-4">
          <MetricCell label="TVL" value={formatUsd(pair?.tvlUsd)} />
          <MetricCell label="24h Vol" value={formatUsd(pair?.volume24h)} />
          <MetricCell label="24h Fees" value={formatUsd(pair?.fees24h)} />
          <MetricCell label="Bin Step" value={numberOrDash(pair?.binStep)} />
        </div>

        {/* Related Pools */}
        {(() => {
          const relatedPools = report.relatedPools ?? [];
          if (relatedPools.length === 0) return null;
          return (
            <RelatedPoolsPanel
              pools={relatedPools}
              currentPoolAddress={pair?.poolAddress}
              pairName={name}
            />
          );
        })()}

        {/* Price */}
        <PanelSection title="Price">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Y per X</p>
              <p className="text-sm font-semibold text-zinc-100 mt-0.5">
                1 {symbolX} = {pair?.priceTokenYPerTokenX ? formatTokenPrice(pair.priceTokenYPerTokenX) : "—"} {symbolY}
              </p>
            </div>
            <div className="rounded border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Inverse</p>
              <p className="text-sm font-semibold text-zinc-100 mt-0.5">
                1 {symbolY} = {pair?.inversePrice ? formatTokenPrice(pair.inversePrice) : "—"} {symbolX}
              </p>
            </div>
          </div>
        </PanelSection>

        {/* Pool Information */}
        <PanelSection title="Pool Information" className="mt-3">
          <DataRow label="Base fee" value={feePct(pair?.baseFeePct)} />
          <DataRow label="Dynamic fee" value={feePct(pair?.dynamicFeePct)} />
          <DataRow label="Max fee" value={feePct(pair?.maxFeePct)} />
          <DataRow label="Protocol fee" value={feePct(pair?.protocolFeePct)} />
          <DataRow label="APR / APY" value={`${pctValue(pair?.apr)} / ${pctValue(pair?.apy)}`} />
        </PanelSection>

        {/* Indicators */}
        <PanelSection title="Indicators" className="mt-3">
          <IndicatorsPanel
            poolAddress={pair?.poolAddress}
            currentPrice={pair?.priceTokenYPerTokenX}
            symbolY={symbolY}
          />
        </PanelSection>

        {/* Tags */}
        {pair?.tags?.length ? (
          <PanelSection title="Tags" className="mt-3">
            <div className="flex flex-wrap gap-1">
              {pair.tags.map((tag) => (
                <span key={tag} className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400">{tag}</span>
              ))}
            </div>
          </PanelSection>
        ) : null}
      </section>

      {/* ─── Right Rail: Sources ─── */}
      <aside className="panel-scroll p-3 lg:col-span-2 xl:col-span-1">
        <PanelSection title="Sources">
          <SourcesList sources={report.sources} fetchedAt={report.fetchedAt} />
        </PanelSection>
      </aside>
    </div>
  );
}
