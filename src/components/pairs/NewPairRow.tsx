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
    return <span className="text-emerald-400" aria-label="Freeze authority disabled">Off</span>;
  }
  if (token.freezeAuthorityDisabled === false) {
    return <span className="text-red-400" aria-label="Freeze authority enabled">On</span>;
  }
  return <span className="text-zinc-500" aria-label="Freeze authority unknown">–</span>;
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
    <span className="inline-flex items-center rounded bg-[var(--accent)]/15 px-1 py-0 text-[9px] font-bold uppercase tracking-wider text-[var(--accent)]">
      New
    </span>
  );
}

export function NewPairRow({
  pool,
  visibleColumns,
  density,
  timeframe,
  newPoolIds,
  maxTvl,
  onSelectPool,
}: NewPairRowProps) {
  const pad = density === "compact" ? "px-3 py-2" : "px-4 py-3";
  const textSize = density === "compact" ? "text-xs" : "text-sm";
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
      className="border-b border-[var(--panel-border)] cursor-pointer transition hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
    >
      {visibleColumns.has("pair") && (
        <td className={pad}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-zinc-200">
              {pool.tokenX.symbol ?? "?"}
            </span>
            {pool.tokenX.verified && <VerificationDot />}
            <span className="text-zinc-500 text-xs">/</span>
            <span className="text-xs font-medium text-zinc-200">
              {pool.tokenY.symbol ?? "?"}
            </span>
            {pool.tokenY.verified && <VerificationDot />}
            {newPoolIds.has(pool.poolAddress) && <NewBadge />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-zinc-500 truncate max-w-[140px]">
              {pool.name ||
                `${pool.tokenX.symbol ?? "?"}/${pool.tokenY.symbol ?? "?"}`}
            </span>
            <span className="text-[10px] text-zinc-600 font-mono tabular-nums">
              {shortenAddress(pool.poolAddress)}
            </span>
            <CopyButton address={pool.poolAddress} />
            <ExternalIconLinks poolAddress={pool.poolAddress} primaryMint={primaryToken.mint} />
          </div>
        </td>
      )}
      {visibleColumns.has("priceTokenYPerTokenX") && (
        <td className={`text-right font-medium tabular-nums text-zinc-300 ${pad} ${textSize}`}>
          {formatTokenPrice(primaryToken.priceUsd)}
        </td>
      )}
      {visibleColumns.has("tvlUsd") && (
        <td className={`text-right font-medium tabular-nums text-zinc-300 ${pad} ${textSize}`}>
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
        <td className={`text-right font-medium tabular-nums text-zinc-300 ${pad} ${textSize}`}>
          {formatCompactUsd(pool.volume?.[timeframe])}
        </td>
      )}
      {visibleColumns.has("fees24h") && (
        <td className={`text-right font-medium tabular-nums text-zinc-300 ${pad} ${textSize}`}>
          {formatCompactUsd(pool.fees?.[timeframe])}
        </td>
      )}
      {visibleColumns.has("apr") && (
        <td className={`text-right font-medium tabular-nums ${getAprClass(pool.apr)} ${pad} ${textSize}`}>
          {pctValue(pool.apr)}
        </td>
      )}
      {visibleColumns.has("binStep") && (
        <td className={`text-right font-medium tabular-nums text-zinc-300 ${pad} ${textSize}`}>
          {pool.binStep ?? "–"}
        </td>
      )}
      {visibleColumns.has("baseFeePct") && (
        <td className={`text-right font-medium tabular-nums text-zinc-300 ${pad} ${textSize}`}>
          {pctValue(pool.baseFeePct)}
        </td>
      )}
      {visibleColumns.has("marketCap") && (
        <td className={`text-right font-medium tabular-nums text-zinc-300 ${pad} ${textSize}`}>
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
        <td className={`text-right font-medium tabular-nums text-zinc-300 ${pad} ${textSize}`}>
          {formatCompactNumber(primaryToken.holders)}
        </td>
      )}
      {visibleColumns.has("createdAt") && (
        <td className={`text-right font-medium tabular-nums text-zinc-400 ${pad} ${textSize}`}>
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
            <span className="text-zinc-600">–</span>
          )}
        </td>
      )}
    </tr>
  );
}
