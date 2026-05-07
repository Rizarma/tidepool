import type { PoolDiscoveryReport } from "@/lib/api-types";
import { formatUsd, pctValue, short } from "@/lib/format";

export function DiscoveryPanel({
  discovery,
  selectedPoolAddress,
  onSelectPool,
  onRunTokenScan,
}: {
  discovery: PoolDiscoveryReport;
  selectedPoolAddress: string | null;
  onSelectPool?: (poolAddress: string) => void;
  onRunTokenScan?: (mint: string) => void;
}) {
  const pools = discovery.pools ?? [];
  const poolCount = discovery.totalMatched ?? pools.length;
  const hasMultiple = pools.length > 1;
  const discoveredMint = discovery.query?.mint;

  return (
    <div className="mb-4 space-y-2">
      {/* Detection copy */}
      <div className="rounded border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
        <p className="text-xs text-cyan-200">
          Found Meteora DLMM pools containing this address as a token mint.
        </p>
        <p className="mt-1 text-[11px] text-cyan-300/70">
          {poolCount} matching {poolCount === 1 ? "pool" : "pools"} found.{" "}
          {discovery.selectionReason === "highest_tvl" && "Highest TVL selected."}
          {discovery.selectionReason === "highest_volume" && "Highest volume selected."}
          {discovery.selectionReason === "single_match" && "Single match selected."}
        </p>
      </div>

      {/* Pool chooser rows */}
      {hasMultiple && (
        <div className="rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[var(--panel-border)]">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Select Pool</span>
          </div>
          <div className="max-h-[180px] overflow-y-auto">
            {pools.map((pool, index) => {
              const poolAddress = pool.poolAddress;
              const isSelected = poolAddress === selectedPoolAddress;
              const pairName = pool.name ?? `${pool.tokenX?.symbol ?? "?"} / ${pool.tokenY?.symbol ?? "?"}`;
              return (
                <button
                  key={pool.poolAddress ?? index}
                  type="button"
                  onClick={() => poolAddress && onSelectPool?.(poolAddress)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-3 transition border-b border-[var(--panel-border)] last:border-b-0 ${
                    isSelected
                      ? "bg-[var(--accent)]/[0.06] border-l-2 border-l-[var(--accent)]"
                      : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${isSelected ? "Selected" : "Select"} ${pairName} pool ${short(pool.poolAddress) ?? "unknown address"}, TVL ${formatUsd(pool.tvlUsd)}, 24h volume ${formatUsd(pool.volume24h)}`}
                >
                  {/* Pair name + address */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium truncate ${isSelected ? "text-zinc-100" : "text-zinc-300"}`}>
                      {pairName}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-500 truncate">
                      {short(pool.poolAddress)}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="shrink-0 flex items-center gap-3 text-[10px] tabular-nums text-zinc-400">
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
          className="inline-flex items-center gap-1.5 rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
        >
          <span className="text-[10px]">→</span>
          Run token scan for entered mint
          <span className="font-mono text-[10px] text-zinc-500">{short(discoveredMint)}</span>
        </button>
      )}
    </div>
  );
}
