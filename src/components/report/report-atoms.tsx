import type { PairToken, RiskLevel } from "@/lib/api-types";
import { formatNumber, formatUsd, numberOrDash, shortenAddress, yesNo } from "@/lib/format";
import { CopyButton } from "@/components/CopyButton";

export function DataRow({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-[var(--panel-border)] last:border-b-0">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span title={value} className={`text-[11px] font-medium tabular-nums text-right truncate max-w-[14rem] ${bad ? "text-red-300" : "text-zinc-200"}`}>
        {value}
      </span>
    </div>
  );
}

export function RiskBadge({ level, score }: { level: RiskLevel; score: number }) {
  const styles: Record<RiskLevel, string> = {
    low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    medium: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    high: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    critical: "border-red-500/30 bg-red-500/10 text-red-300",
  };

  return (
    <div className={`rounded border px-3 py-2 flex items-center justify-between ${styles[level]}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider">{level} risk</span>
      <span className="text-lg font-black tabular-nums">{score}</span>
    </div>
  );
}

export function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-100 tabular-nums truncate">{value}</p>
    </div>
  );
}

export function PanelSection({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}

export function TokenSummaryCompact({ token }: { token?: PairToken }) {
  return (
    <div>
      <DataRow label="Name" value={token?.name ?? "—"} />
      <DataRow label="Symbol" value={token?.symbol ?? "—"} />
      {token?.mint && (
        <div className="flex items-center justify-between gap-2 py-1 border-b border-[var(--panel-border)]">
          <span className="text-[11px] text-zinc-500">Mint</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-zinc-400" title={token.mint}>
              {shortenAddress(token.mint)}
            </span>
            <CopyButton address={token.mint} />
          </div>
        </div>
      )}
      <DataRow label="Amount" value={formatNumber(token?.amount)} />
      <DataRow label="Price (USD)" value={formatUsd(token?.priceUsd)} />
      <DataRow label="Decimals" value={numberOrDash(token?.decimals)} />
      <DataRow label="Verified" value={yesNo(token?.verified)} bad={token?.verified === false} />
    </div>
  );
}
