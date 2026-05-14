import type { TokenReport } from "@/lib/api-types";
import {
  formatNumber,
  formatUsd,
  isBadRugLevel,
  numberOrDash,
  pct,
  programLabel,
  short,
  yesNo,
} from "@/lib/format";
import { SourcesList } from "@/components/report/SourcesList";
import { TokenImage } from "@/components/report/TokenImage";
import { DataRow, MetricCell, PanelSection, RiskBadge } from "@/components/report/report-atoms";

export function TokenReportLayout({ report }: { report: TokenReport }) {
  const name = report.identity?.name ?? report.identity?.symbol ?? "Unknown";
  const score = report.risk?.score ?? 0;
  const level = report.risk?.level ?? "low";

  return (
    <div className="h-full lg:grid lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr_300px] xl:grid-rows-[1fr]">
      {/* ─── Left Rail: Identity + Authority ─── */}
      <aside className="border-b xl:border-b-0 xl:border-r border-[var(--panel-border)] panel-scroll p-3">
        {/* Identity */}
        <div className="flex items-center gap-3 mb-3">
          <TokenImage src={report.identity?.imageUrl} symbol={report.identity?.symbol} size={40} />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-zinc-100 truncate">{name}</h1>
            <p className="font-mono text-[11px] text-zinc-400">{report.identity?.symbol ?? "—"}</p>
          </div>
        </div>
        <p className="font-mono text-[10px] text-zinc-400 break-all mb-4">{report.identity?.mint}</p>

        {/* Risk badge */}
        <RiskBadge level={level} score={score} />

        {/* Authority checks */}
        <PanelSection as="h2" title="Authority" className="mt-4">
          <DataRow label="Mint auth" value={short(report.supply?.mintAuthority) ?? "Revoked"} bad={Boolean(report.supply?.mintAuthority)} />
          <DataRow label="Freeze auth" value={short(report.supply?.freezeAuthority) ?? "Revoked"} bad={Boolean(report.supply?.freezeAuthority)} />
          <DataRow label="Program" value={programLabel(report.identity?.tokenProgram)} />
          <DataRow label="Decimals" value={String(report.supply?.decimals ?? report.identity?.decimals ?? "—")} />
          <DataRow label="Supply" value={formatNumber(report.supply?.uiAmount)} />
        </PanelSection>

        {/* Trust */}
        <PanelSection as="h2" title="Trust" className="mt-3">
          <DataRow label="Jupiter strict" value={yesNo(report.trust?.jupiterStrict)} bad={report.trust?.jupiterStrict === false} />
          <DataRow label="RugCheck" value={report.trust?.rugCheckLevel ?? "—"} bad={isBadRugLevel(report.trust?.rugCheckLevel)} />
          <DataRow label="RC score" value={numberOrDash(report.trust?.rugCheckScore)} />
          <DataRow label="Top holder" value={pct(report.trust?.topHolderPct)} bad={(report.trust?.topHolderPct ?? 0) > 20} />
          <DataRow label="DEX" value={report.market?.dexId ?? "—"} />
        </PanelSection>
      </aside>

      {/* ─── Center: Metrics + Risk Factors ─── */}
      <section className="border-b xl:border-b-0 xl:border-r border-[var(--panel-border)] panel-scroll p-3">
        {/* Key metrics row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-4">
          <MetricCell label="Price" value={formatUsd(report.market?.priceUsd)} />
          <MetricCell label="Liquidity" value={formatUsd(report.market?.liquidity)} />
          <MetricCell label="24h Vol" value={formatUsd(report.market?.volume24h)} />
          <MetricCell label="MCap/FDV" value={formatUsd(report.market?.marketCap)} />
        </div>

        {/* Risk factors */}
        <PanelSection as="h2" title="Risk Factors">
          {report.risk?.factors?.length ? (
            <div className="space-y-1.5">
              {report.risk.factors.map((factor, index) => (
                <div key={`${factor.key}-${index}`} className="flex items-start justify-between gap-2 rounded border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2">
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium text-zinc-200">{factor.label ?? "Risk factor"}</h3>
                    {factor.detail && <p className="mt-0.5 text-[11px] leading-4 text-zinc-400">{factor.detail}</p>}
                  </div>
                  <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 tabular-nums">
                    +{factor.weight ?? 0}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
              No major risk factors detected. This does not mean the token is safe.
            </p>
          )}
        </PanelSection>
      </section>

      {/* ─── Right Rail: Sources ─── */}
      <aside className="panel-scroll p-3 lg:col-span-2 xl:col-span-1">
        <PanelSection as="h2" title="Sources">
          <SourcesList sources={report.sources} fetchedAt={report.fetchedAt} />
        </PanelSection>
      </aside>
    </div>
  );
}
