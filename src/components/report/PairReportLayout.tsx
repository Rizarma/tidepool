import type { PoolDiscoveryReport, PoolReport } from "@/lib/api-types";
import {
  feePct,
  formatTokenPrice,
  formatUsd,
  numberOrDash,
  pctValue,
} from "@/lib/format";
import { SourcesList } from "@/components/report/SourcesList";
import { DataRow, MetricCell, PanelSection, TokenSummaryCompact } from "@/components/report/report-atoms";
import { DiscoveryPanel } from "@/components/report/DiscoveryPanel";

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

  return (
    <div className="h-full lg:grid lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr_300px] xl:grid-rows-[1fr]">
      {/* ─── Left Rail: Pool identity + Tokens ─── */}
      <aside className="border-b xl:border-b-0 xl:border-r border-[var(--panel-border)] panel-scroll p-3">
        <div className="mb-3">
          <span className="inline-block rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1.5">
            Meteora DLMM
          </span>
          <p className="text-sm font-semibold text-zinc-100">{name}</p>
          <p className="font-mono text-[10px] text-zinc-500 break-all mt-1">{pair?.poolAddress}</p>
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

        {/* Price */}
        <PanelSection title="Price">
          <div className="rounded border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 mb-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Y per X</p>
            <p className="text-sm font-semibold text-zinc-100 mt-0.5">
              1 {symbolX} = {formatTokenPrice(pair?.priceTokenYPerTokenX)} {symbolY}
            </p>
          </div>
          <div className="rounded border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Inverse</p>
            <p className="text-sm font-semibold text-zinc-100 mt-0.5">
              1 {symbolY} = {formatTokenPrice(pair?.inversePrice)} {symbolX}
            </p>
          </div>
        </PanelSection>

        {/* Fees */}
        <PanelSection title="Pool Fees" className="mt-3">
          <DataRow label="Base fee" value={feePct(pair?.baseFeePct)} />
          <DataRow label="Dynamic fee" value={feePct(pair?.dynamicFeePct)} />
          <DataRow label="Max fee" value={feePct(pair?.maxFeePct)} />
          <DataRow label="Protocol fee" value={feePct(pair?.protocolFeePct)} />
          <DataRow label="APR / APY" value={`${pctValue(pair?.apr)} / ${pctValue(pair?.apy)}`} />
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
