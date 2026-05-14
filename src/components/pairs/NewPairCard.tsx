"use client";

import { memo } from "react";
import type { DlmmPairInfo, PairToken } from "@/lib/types";
import {
  formatTokenPrice,
  formatCompactUsd,
  formatCompactNumber,
  formatAge,
  pctValue,
  shortenAddress,
} from "@/lib/format";
import { CopyButton } from "@/components/CopyButton";
import { ExternalIconLinks } from "./ExternalIconLinks";
import { ColumnKey, Timeframe } from "./new-pairs-config";
import { getPrimaryToken, getAprClass } from "./pair-utils";

interface NewPairCardProps {
  pool: DlmmPairInfo;
  visibleColumns: Set<ColumnKey>;
  density: "compact" | "comfortable";
  timeframe: Timeframe;
  newPoolIds: Set<string>;
  onSelectPool: (poolAddress: string) => void;
}

function FreezeStatus({ token }: { token: PairToken }) {
  if (token.freezeAuthorityDisabled === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Off
      </span>
    );
  }
  if (token.freezeAuthorityDisabled === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border border-red-500/25 bg-red-500/10 text-red-300">
        <span className="size-1.5 rounded-full bg-red-400" />
        On
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border border-zinc-700 bg-zinc-800/40 text-zinc-500">
      <span className="size-1.5 rounded-full bg-zinc-600" />
      –
    </span>
  );
}

function NewBadge() {
  return (
    <span className="inline-flex items-center rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--background)] shadow-[0_0_12px_rgba(232,164,74,0.25)]">
      New
    </span>
  );
}

function Metric({
  label,
  value,
  className = "",
  highlight = false,
}: {
  label: string;
  value: string;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`text-xs font-semibold font-mono tabular-nums overflow-hidden ${highlight ? "text-zinc-200" : "text-zinc-300"} ${className}`}
      >
        {value}
      </div>
    </div>
  );
}

export const NewPairCard = memo(function NewPairCard({
  pool,
  visibleColumns,
  timeframe,
  newPoolIds,
  onSelectPool,
}: NewPairCardProps) {
  const primaryToken = getPrimaryToken(pool);
  const isNew = newPoolIds.has(pool.poolAddress);

  return (
    <div
      onClick={() => onSelectPool(pool.poolAddress)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectPool(pool.poolAddress);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open pool ${pool.tokenX.symbol ?? "?"}/${pool.tokenY.symbol ?? "?"}`}
      className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-lg p-4 cursor-pointer transition hover:border-white/[0.1] hover:bg-white/[0.02]"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-zinc-200">
              {pool.tokenX.symbol ?? "?"}
            </span>
            <span className="text-zinc-500 text-xs">/</span>
            <span className="text-sm font-semibold text-zinc-200">
              {pool.tokenY.symbol ?? "?"}
            </span>
            {isNew && <NewBadge />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-zinc-500 truncate max-w-[140px]">
              {pool.name || `${pool.tokenX.symbol ?? "?"}/${pool.tokenY.symbol ?? "?"}`}
            </span>
            <span className="text-[10px] text-zinc-600 font-mono tabular-nums">
              {shortenAddress(pool.poolAddress)}
            </span>
            <CopyButton address={pool.poolAddress} />
          </div>
        </div>
        <ExternalIconLinks
          poolAddress={pool.poolAddress}
          primaryMint={primaryToken.mint}
          size="sm"
        />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-3">
        {visibleColumns.has("priceTokenYPerTokenX") && (
          <Metric label="Price" value={formatTokenPrice(primaryToken.priceUsd)} />
        )}
        {visibleColumns.has("tvlUsd") && (
          <Metric
            label="TVL"
            value={formatCompactUsd(pool.tvlUsd)}
            highlight
          />
        )}
        {visibleColumns.has("volume24h") && (
          <Metric label={`${timeframe} Vol`} value={formatCompactUsd(pool.volume?.[timeframe])} />
        )}
        {visibleColumns.has("fees24h") && (
          <Metric label={`${timeframe} Fees`} value={formatCompactUsd(pool.fees?.[timeframe])} />
        )}
        {visibleColumns.has("apr") && (
          <Metric
            label="APR"
            value={pctValue(pool.apr)}
            className={getAprClass(pool.apr)}
          />
        )}
        {visibleColumns.has("binStep") && (
          <Metric label="Bin Step" value={String(pool.binStep ?? "–")} />
        )}
        {visibleColumns.has("baseFeePct") && (
          <Metric label="Base Fee" value={pctValue(pool.baseFeePct)} />
        )}
        {visibleColumns.has("marketCap") && (
          <Metric label="MCap" value={formatCompactUsd(primaryToken.marketCap)} />
        )}
        {visibleColumns.has("holders") && (
          <Metric label="Holders" value={formatCompactNumber(primaryToken.holders)} />
        )}
        {visibleColumns.has("createdAt") && (
          <Metric label="Age" value={formatAge(pool.createdAt)} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--panel-border)]">
        {visibleColumns.has("freeze") && <FreezeStatus token={primaryToken} />}
        {visibleColumns.has("launchpad") && pool.launchpad ? (
          <span className="text-[10px] text-zinc-400">{pool.launchpad}</span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
});
