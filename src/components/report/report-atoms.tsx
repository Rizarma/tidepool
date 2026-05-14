import type { PairToken, RiskLevel } from "@/lib/api-types";
import { formatCompactNumber, formatCompactUsd, formatNumber, formatUsd, shortenAddress } from "@/lib/format";
import { CopyButton } from "@/components/CopyButton";

export function DataRow({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-[var(--panel-border)] last:border-b-0">
      <span className="text-[11px] text-zinc-400">{label}</span>
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
      <p className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-100 tabular-nums truncate">{value}</p>
    </div>
  );
}

export function PanelSection({ title, children, className = "", as: Tag = "h3" }: { title: string; children: React.ReactNode; className?: string; as?: "h1" | "h2" | "h3" }) {
  return (
    <div className={className}>
      <Tag className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 mb-2">{title}</Tag>
      {children}
    </div>
  );
}

export function TokenSummaryCompact({ token }: { token?: PairToken }) {
  return (
    <div>
      {/* — Identity — */}
      <DataRow label="Name" value={token?.name ?? "—"} />
      <DataRow label="Symbol" value={token?.symbol ?? "—"} />
      {token?.mint && (
        <div className="flex items-center justify-between gap-2 py-1 border-b border-[var(--panel-border)]">
          <span className="text-[11px] text-zinc-400">Mint</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-zinc-400" title={token.mint}>
              {shortenAddress(token.mint)}
            </span>
            <CopyButton address={token.mint} />
          </div>
        </div>
      )}
      {/* — Value — */}
      <DataRow label="Price (USD)" value={formatUsd(token?.priceUsd)} />
      <DataRow label="Market Cap" value={formatCompactUsd(token?.marketCap)} />
      {/* — Pool — */}
      <DataRow label="Reserve" value={formatNumber(token?.amount)} />
      {/* — Metadata — */}
      {token?.holders !== undefined && (
        <DataRow label="Holders" value={formatCompactNumber(token?.holders)} />
      )}
    </div>
  );
}

export function TerminalSection({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-4">
        {title}
      </h3>
      {subtitle && <p className="text-xs text-zinc-400 mb-2">{subtitle}</p>}
      {children}
    </div>
  );
}

export function TerminalMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const toneClasses: Record<string, string> = {
    neutral: "text-zinc-100",
    good: "text-emerald-300",
    bad: "text-red-300",
    warn: "text-amber-300",
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-400 uppercase tracking-wide">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${toneClasses[tone]}`}>
        {value}
      </span>
    </div>
  );
}

export function TerminalDataRow({
  label,
  value,
  bad = false,
}: {
  label: string;
  value: string;
  bad?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-zinc-400">{label}</span>
      <span
        className={`text-sm font-medium tabular-nums text-right ${bad ? "text-red-300" : "text-zinc-200"}`}
      >
        {value}
      </span>
    </div>
  );
}
