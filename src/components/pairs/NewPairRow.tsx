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

interface NewPairRowProps {
  pool: DlmmPairInfo;
  visibleColumns: Set<ColumnKey>;
  density: "compact" | "comfortable";
  timeframe: Timeframe;
  newPoolIds: Set<string>;
  maxTvl: number;
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
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border border-zinc-700 bg-zinc-800/40 text-zinc-400">
      <span className="size-1.5 rounded-full bg-zinc-600" />
      –
    </span>
  );
}

function VerificationDot() {
  return (
    <span
      className="inline-block size-1.5 rounded-full bg-[var(--accent)] shrink-0"
      title="Verified"
      aria-label="Verified"
    />
  );
}

function NewBadge() {
  return (
    <span className="inline-flex items-center rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--background)] shadow-[0_0_12px_rgba(232,164,74,0.25)]">
      New
    </span>
  );
}

export const NewPairRow = memo(function NewPairRow({
  pool,
  visibleColumns,
  density,
  timeframe,
  newPoolIds,
  maxTvl,
  onSelectPool,
}: NewPairRowProps) {
  const pad = density === "compact" ? "px-3 py-2" : "px-4 py-3";

  const primaryToken = getPrimaryToken(pool);

  return (
    <tr
      tabIndex={0}
      role="button"
      onClick={() => onSelectPool(pool.poolAddress)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectPool(pool.poolAddress);
        }
      }}
      className="border-b border-[var(--panel-border)] cursor-pointer transition group even:bg-white/[0.015] hover:bg-white/[0.05] border-l-2 border-transparent hover:border-l-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
    >
      {visibleColumns.has("pair") && (
        <td className={`sticky left-0 z-10 bg-[var(--panel-bg)] ${pad}`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-zinc-200">
              {pool.tokenX.symbol ?? "?"}
            </span>
            {pool.tokenX.verified && <VerificationDot />}
            <span className="text-zinc-400 text-xs">/</span>
            <span className="text-xs font-medium text-zinc-200">
              {pool.tokenY.symbol ?? "?"}
            </span>
            {pool.tokenY.verified && <VerificationDot />}
            {newPoolIds.has(pool.poolAddress) && <NewBadge />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-zinc-400 truncate max-w-[140px]">
              {pool.name ||
                `${pool.tokenX.symbol ?? "?"}/${pool.tokenY.symbol ?? "?"}`}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
              {shortenAddress(pool.poolAddress)}
            </span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton address={pool.poolAddress} />
            </span>
            <ExternalIconLinks poolAddress={pool.poolAddress} primaryMint={primaryToken.mint} />
          </div>
        </td>
      )}
      {visibleColumns.has("priceTokenYPerTokenX") && (
        <td className={`text-right ${density === "compact" ? "text-xs" : "text-sm"} font-semibold font-mono text-zinc-200 tabular-nums ${pad}`}>
          {formatTokenPrice(primaryToken.priceUsd)}
        </td>
      )}
      {visibleColumns.has("tvlUsd") && (
        <td className={`text-right ${density === "compact" ? "text-xs" : "text-sm"} font-semibold font-mono text-zinc-200 tabular-nums ${pad}`}>
          <div className="relative inline-block w-full">
            <div
              className="absolute inset-y-0 left-0 bg-[var(--accent)]/10 rounded-sm"
              style={{ width: `${Math.min(100, ((pool.tvlUsd ?? 0) / maxTvl) * 100)}%` }}
            />
            <span className="relative z-10">{formatCompactUsd(pool.tvlUsd)}</span>
          </div>
        </td>
      )}
      {visibleColumns.has("volume24h") && (
        <td className={`text-right ${density === "compact" ? "text-xs" : "text-sm"} font-semibold font-mono text-zinc-200 tabular-nums ${pad}`}>
          {formatCompactUsd(pool.volume?.[timeframe])}
        </td>
      )}
      {visibleColumns.has("fees24h") && (
        <td className={`text-right ${density === "compact" ? "text-xs" : "text-sm"} font-semibold font-mono text-zinc-200 tabular-nums ${pad}`}>
          {formatCompactUsd(pool.fees?.[timeframe])}
        </td>
      )}
      {visibleColumns.has("apr") && (
        <td className={`text-right ${density === "compact" ? "text-xs" : "text-sm"} font-semibold font-mono ${getAprClass(pool.apr)} ${pad}`}>
          {pctValue(pool.apr)}
        </td>
      )}
      {visibleColumns.has("binStep") && (
        <td className={`text-right ${density === "compact" ? "text-xs" : "text-sm"} font-normal font-mono text-zinc-400 tabular-nums ${pad}`}>
          {pool.binStep ?? "–"}
        </td>
      )}
      {visibleColumns.has("baseFeePct") && (
        <td className={`text-right ${density === "compact" ? "text-xs" : "text-sm"} font-normal font-mono text-zinc-400 tabular-nums ${pad}`}>
          {pctValue(pool.baseFeePct)}
        </td>
      )}
      {visibleColumns.has("marketCap") && (
        <td className={`text-right ${density === "compact" ? "text-xs" : "text-sm"} font-medium font-mono text-zinc-300 tabular-nums ${pad}`}>
          {formatCompactUsd(primaryToken.marketCap)}
          {primaryToken.marketCapFallback && (
            <span
              className="inline-flex items-center justify-center size-3.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-bold leading-none ml-1 align-middle"
              title="Market cap computed from price × total supply (Meteora returned 0)"
            >
              !
            </span>
          )}
        </td>
      )}
      {visibleColumns.has("holders") && (
        <td className={`text-right ${density === "compact" ? "text-xs" : "text-sm"} font-medium font-mono text-zinc-300 tabular-nums ${pad}`}>
          {formatCompactNumber(primaryToken.holders)}
        </td>
      )}
      {visibleColumns.has("createdAt") && (
        <td className={`text-right ${density === "compact" ? "text-xs" : "text-sm"} font-normal font-mono text-zinc-400 tabular-nums ${pad}`}>
          {formatAge(pool.createdAt)}
        </td>
      )}
      {visibleColumns.has("freeze") && (
        <td className={`text-center text-xs ${pad}`}>
          <FreezeStatus token={primaryToken} />
        </td>
      )}
      {visibleColumns.has("launchpad") && (
        <td className={`text-center text-xs ${pad}`}>
          {pool.launchpad ? (
            <span className="text-[10px] text-zinc-400">{pool.launchpad}</span>
          ) : (
            <span className="text-zinc-500">–</span>
          )}
        </td>
      )}
    </tr>
  );
});
