import type { PoolDiscoveryReport } from "@/lib/api-types";
import { formatUsd, pctValue, short } from "@/lib/format";

export function DiscoveryPanel({
  discovery,
  selectedPoolAddress,
  onSelectPool,
  onRunTokenScan,
  variant = "default",
}: {
  discovery: PoolDiscoveryReport;
  selectedPoolAddress: string | null;
  onSelectPool?: (poolAddress: string) => void;
  onRunTokenScan?: (mint: string) => void;
  variant?: "default" | "compact";
}) {
  const pools = discovery.pools ?? [];
  const poolCount = discovery.totalMatched ?? pools.length;
  const hasMultiple = pools.length > 1;
  const discoveredMint = discovery.query?.mint;
  const isCompact = variant === "compact";

  return (
    <div className={isCompact ? "space-y-2" : "mb-4 space-y-2"}>
      {/* Detection copy */}
      <div
        className={
          isCompact
            ? "rounded bg-cyan-500/5 px-3 py-2"
            : "rounded border border-cyan-500/20 bg-cyan-500/5 px-3 py-2"
        }
      >
        <p
          className={
            isCompact ? "text-sm text-cyan-200" : "text-xs text-cyan-200"
          }
        >
          Found Meteora DLMM pools containing this address as a token mint.
        </p>
        <p
          className={
            isCompact
              ? "mt-1 text-xs text-cyan-300/70"
              : "mt-1 text-xs text-cyan-300/70"
          }
        >
          {poolCount} matching {poolCount === 1 ? "pool" : "pools"} found.{" "}
          {discovery.selectionReason === "highest_tvl" &&
            "Highest TVL selected."}
          {discovery.selectionReason === "highest_volume" &&
            "Highest volume selected."}
          {discovery.selectionReason === "single_match" &&
            "Single match selected."}
        </p>
      </div>

      {/* Pool chooser rows */}
      {hasMultiple && (
        <div
          className={
            isCompact
              ? "rounded bg-white/[0.03] overflow-hidden"
              : "rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] overflow-hidden"
          }
        >
          {!isCompact && (
            <div className="px-3 py-1.5 border-b border-[var(--panel-border)]">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Select Pool
              </span>
            </div>
          )}
          <div
            className={`overflow-y-auto ${isCompact ? "max-h-[160px]" : "max-h-[180px]"}`}
          >
            {pools.map((pool, index) => {
              const poolAddress = pool.poolAddress;
              const isSelected = poolAddress === selectedPoolAddress;
              const pairName =
                pool.name ??
                `${pool.tokenX?.symbol ?? "?"} / ${pool.tokenY?.symbol ?? "?"}`;
              return (
                <button
                  key={pool.poolAddress ?? index}
                  type="button"
                  onClick={() =>
                    poolAddress && onSelectPool?.(poolAddress)
                  }
                  className={`w-full text-left px-3 py-2 flex items-center gap-3 transition ${
                    isCompact
                      ? "border-b border-white/[0.04] last:border-b-0"
                      : "border-b border-[var(--panel-border)] last:border-b-0"
                  } ${
                    isSelected
                      ? "bg-[var(--accent)]/[0.06] border-l-2 border-l-[var(--accent)]"
                      : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${isSelected ? "Selected" : "Select"} ${pairName} pool ${short(pool.poolAddress) ?? "unknown address"}, TVL ${formatUsd(pool.tvlUsd)}, 24h volume ${formatUsd(pool.volume24h)}`}
                >
                  {/* Pair name + address */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium truncate ${isCompact ? "text-sm" : "text-xs"} ${isSelected ? "text-zinc-100" : "text-zinc-300"}`}
                    >
                      {pairName}
                    </p>
                    <p
                      className={`font-mono text-zinc-500 truncate text-xs`}
                    >
                      {short(pool.poolAddress)}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div
                    className={`shrink-0 flex items-center gap-3 tabular-nums text-zinc-400 text-xs`}
                  >
                    {pool.tvlUsd != null && (
                      <span title="TVL">
                        <span className="text-zinc-600 mr-0.5">TVL</span>
                        {formatUsd(pool.tvlUsd)}
                      </span>
                    )}
                    {pool.volume24h != null && (
                      <span title="24h Volume">
                        <span className="text-zinc-600 mr-0.5">Vol</span>
                        {formatUsd(pool.volume24h)}
                      </span>
                    )}
                    {pool.apr != null && (
                      <span title="APR">
                        <span className="text-zinc-600 mr-0.5">APR</span>
                        {pctValue(pool.apr)}
                      </span>
                    )}
                    {pool.binStep != null && (
                      <span title="Bin Step">
                        <span className="text-zinc-600 mr-0.5">Bin</span>
                        {pool.binStep}
                      </span>
                    )}
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <span className="shrink-0 size-1.5 rounded-full bg-[var(--accent)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Run Token scan CTA */}
      {discoveredMint && onRunTokenScan && (
        <button
          type="button"
          onClick={() => onRunTokenScan(discoveredMint)}
          className={`inline-flex items-center gap-1.5 rounded transition ${
            isCompact
              ? "bg-white/[0.03] px-2.5 py-1 text-sm font-medium text-zinc-300 hover:text-[var(--accent)]"
              : "border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-sm font-medium text-zinc-300 hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
          }`}
        >
          <span className="text-xs">→</span>
          Run token scan for entered mint
          <span
            className={`font-mono text-zinc-500 text-xs`}
          >
            {short(discoveredMint)}
          </span>
        </button>
      )}
    </div>
  );
}
