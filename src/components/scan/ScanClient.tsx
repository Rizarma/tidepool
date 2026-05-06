"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import type {
  PairInputMode,
  PairToken,
  PoolDiscoveryReport,
  PoolReport,
  RiskLevel,
  ScanMode,
  ScanReport,
  TokenReport,
} from "@/lib/api-types";
import {
  feePct,
  formatNumber,
  formatTokenPrice,
  formatUsd,
  isBadRugLevel,
  numberOrDash,
  pct,
  pctValue,
  programLabel,
  short,
  yesNo,
} from "@/lib/format";
import { parseApiError } from "@/lib/api-errors";
import { SourcesList } from "@/components/report/SourcesList";
import { TokenImage } from "@/components/report/TokenImage";

const EXAMPLES = [
  { label: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  { label: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
  { label: "BONK", mint: "DezXAZ8z7PnrnRJjz3kXBoF89VwXktvD9txB9kvpUMP" },
];

export default function ScanClient() {
  const poolInputRef = useRef<HTMLInputElement>(null);
  const scanRequestIdRef = useRef(0);
  const [mint, setMint] = useState("");
  const [mode, setMode] = useState<ScanMode>("pair");
  const [pairInputMode, setPairInputMode] = useState<PairInputMode>("pool");
  const [poolAddress, setPoolAddress] = useState("");
  const [mintA, setMintA] = useState("");
  const [mintB, setMintB] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPoolAddress, setSelectedPoolAddress] = useState<string | null>(null);

  async function scanToken(nextMint = mint) {
    const requestId = ++scanRequestIdRef.current;
    const trimmed = nextMint.trim();
    if (!trimmed) {
      setError("Paste a Solana mint address to scan.");
      return;
    }

    setMint(trimmed);
    setLoading(true);
    setError(null);
    setReport(null);
    setSelectedPoolAddress(null);

    try {
      const response = await fetch(`/api/scan?mint=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(parseApiError(data, "Scan failed"));
      if (requestId !== scanRequestIdRef.current) return;
      setReport(data);
    } catch (err) {
      if (requestId !== scanRequestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      if (requestId === scanRequestIdRef.current) setLoading(false);
    }
  }

  async function scanPair() {
    const requestId = ++scanRequestIdRef.current;
    const trimmedPool = poolAddress.trim();
    const trimmedMintA = mintA.trim();
    const trimmedMintB = mintB.trim();

    if (pairInputMode === "pool" && !trimmedPool) {
      setError("Paste a Meteora DLMM pool address or token mint to scan.");
      return;
    }
    if (pairInputMode === "mints" && (!trimmedMintA || !trimmedMintB)) {
      setError("Paste both token mint addresses for the DLMM pool.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    setSelectedPoolAddress(null);

    try {
      const query =
        pairInputMode === "pool"
          ? `pool=${encodeURIComponent(trimmedPool)}`
          : `mintA=${encodeURIComponent(trimmedMintA)}&mintB=${encodeURIComponent(trimmedMintB)}`;
      const response = await fetch(`/api/scan/pair?${query}`);
      const data = await response.json();

      if (!response.ok) {
        const code = getApiErrorCode(data);
        if (pairInputMode === "pool" && code === "NO_DATA_FOUND") {
          const discoveryResponse = await fetch(`/api/scan/pools?mint=${encodeURIComponent(trimmedPool)}`);
          const discoveryData = await discoveryResponse.json();

          if (!discoveryResponse.ok) {
            if (getApiErrorCode(discoveryData) === "NO_DATA_FOUND") {
              throw new Error("No Meteora DLMM pools found for this address. If this is a token mint, it may trade on another DEX. Try Token mode for broader token analysis.");
            }
            throw new Error(parseApiError(discoveryData, "Pool discovery failed"));
          }

          if (requestId !== scanRequestIdRef.current) return;
          setPoolAddress(trimmedPool);
          setSelectedPoolAddress(getInitialDiscoveryPoolAddress(discoveryData));
          setReport(discoveryData);
          return;
        }

        throw new Error(parseApiError(data, "Pool scan failed"));
      }

      if (requestId !== scanRequestIdRef.current) return;
      setPoolAddress(trimmedPool);
      setMintA(trimmedMintA);
      setMintB(trimmedMintB);
      setReport(data);
    } catch (err) {
      if (requestId !== scanRequestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Pool scan failed");
    } finally {
      if (requestId === scanRequestIdRef.current) setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "token") void scanToken();
    else void scanPair();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (isTyping) return;

      event.preventDefault();
      setMode("pair");
      setPairInputMode("pool");
      requestAnimationFrame(() => {
        poolInputRef.current?.focus();
        poolInputRef.current?.select();
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-shell flex flex-col h-full">
      {/* ─── Command Bar ─────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--panel-bg)]">
        <div className="flex items-center gap-3 px-3 py-2 xl:px-4">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="grid size-7 place-items-center rounded bg-[var(--accent)] text-xs font-black text-[var(--background)]">
              T
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300 hidden sm:inline">
              Tidepool
            </span>
          </div>

          <div className="h-5 w-px bg-[var(--panel-border)] shrink-0" />

          {/* Mode toggle */}
          <div className="flex items-center rounded border border-[var(--panel-border)] bg-[var(--background)] p-0.5" role="group" aria-label="Scan mode">
            <button
              type="button"
              onClick={() => setMode("pair")}
              aria-pressed={mode === "pair"}
              className={`rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
                mode === "pair"
                  ? "bg-[var(--accent)] text-[var(--background)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Pool
            </button>
            <button
              type="button"
              onClick={() => setMode("token")}
              aria-pressed={mode === "token"}
              className={`rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
                mode === "token"
                  ? "bg-[var(--accent)] text-[var(--background)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Token
            </button>
          </div>

          {/* Scan form inline */}
          <form onSubmit={onSubmit} className="flex flex-1 items-center gap-2 min-w-0" aria-label="Scan address form">
            {mode === "token" ? (
              <input
                id="mint"
                aria-label="Token mint address"
                value={mint}
                onChange={(event) => setMint(event.target.value)}
                placeholder="Token mint address…"
                className="flex-1 min-w-0 rounded border border-[var(--panel-border)] bg-[var(--background)] px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
                spellCheck={false}
              />
            ) : pairInputMode === "pool" ? (
              <input
                ref={poolInputRef}
                id="pool"
                aria-label="Meteora DLMM pool or token address"
                value={poolAddress}
                onChange={(event) => setPoolAddress(event.target.value)}
                placeholder="Pool or token address…"
                className="flex-1 min-w-0 rounded border border-[var(--panel-border)] bg-[var(--background)] px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
                spellCheck={false}
              />
            ) : (
              <div className="flex flex-1 gap-1.5 min-w-0">
                <input
                  id="mint-a"
                  aria-label="Token mint A address"
                  value={mintA}
                  onChange={(event) => setMintA(event.target.value)}
                  placeholder="Mint A…"
                  className="flex-1 min-w-0 rounded border border-[var(--panel-border)] bg-[var(--background)] px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
                  spellCheck={false}
                />
                <input
                  id="mint-b"
                  aria-label="Token mint B address"
                  value={mintB}
                  onChange={(event) => setMintB(event.target.value)}
                  placeholder="Mint B…"
                  className="flex-1 min-w-0 rounded border border-[var(--panel-border)] bg-[var(--background)] px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
                  spellCheck={false}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="shrink-0 rounded bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--background)] transition hover:bg-[var(--accent-dim)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "…" : "Scan"}
            </button>
          </form>

          {/* Pool sub-mode toggle */}
          {mode === "pair" && (
            <>
              <div className="h-5 w-px bg-[var(--panel-border)] shrink-0" />
              <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Pool input mode">
                <ModeChip active={pairInputMode === "pool"} onClick={() => setPairInputMode("pool")}>Pool</ModeChip>
                <ModeChip active={pairInputMode === "mints"} onClick={() => setPairInputMode("mints")}>Mints</ModeChip>
              </div>
            </>
          )}

          {/* Examples */}
          {mode === "token" && (
            <>
              <div className="h-5 w-px bg-[var(--panel-border)] shrink-0 hidden xl:block" />
              <div className="hidden xl:flex items-center gap-1 shrink-0">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.mint}
                    type="button"
                    onClick={() => void scanToken(ex.mint)}
                    className="rounded px-2 py-1 text-[10px] font-medium text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-300"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Status indicator */}
          <div className="h-5 w-px bg-[var(--panel-border)] shrink-0 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 shrink-0" role="status" aria-live="polite">
            <span className={`inline-block size-1.5 rounded-full ${loading ? "bg-amber-400 animate-pulse" : report ? "bg-emerald-400" : "bg-zinc-600"}`} />
            <span className="text-[10px] text-zinc-500">
              {loading ? "Scanning" : report ? "Ready" : "Idle"}
            </span>
          </div>
        </div>

        {/* Error bar */}
        {error && (
          <div role="alert" className="border-t border-red-500/20 bg-red-500/5 px-4 py-1.5 text-xs text-red-300">
            {error}
          </div>
        )}
      </header>

      {/* ─── Main Content ────────────────────────────────────────────── */}
      <main className="app-main flex-1 min-h-0 overflow-auto xl:overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : !report ? (
          <EmptyState mode={mode} onScanToken={scanToken} />
        ) : "kind" in report && report.kind === "pair" ? (
          <PairReportLayout report={report} />
        ) : "kind" in report && report.kind === "pool_discovery" ? (
          <PairReportLayout
            report={poolReportFromDiscovery(report, selectedPoolAddress)}
            discovery={report}
            selectedPoolAddress={selectedPoolAddress}
            onSelectPool={setSelectedPoolAddress}
            onRunTokenScan={(mintAddress: string) => {
              setMode("token");
              setMint(mintAddress);
              void scanToken(mintAddress);
            }}
          />
        ) : (
          <TokenReportLayout report={report as TokenReport} />
        )}
      </main>
    </div>
  );
}

// ─── Token Report Layout (3-column on desktop) ──────────────────────────────

function TokenReportLayout({ report }: { report: TokenReport }) {
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
            <p className="text-sm font-semibold text-zinc-100 truncate">{name}</p>
            <p className="font-mono text-[11px] text-zinc-500">{report.identity?.symbol ?? "—"}</p>
          </div>
        </div>
        <p className="font-mono text-[10px] text-zinc-500 break-all mb-4">{report.identity?.mint}</p>

        {/* Risk badge */}
        <RiskBadge level={level} score={score} />

        {/* Authority checks */}
        <PanelSection title="Authority" className="mt-4">
          <DataRow label="Mint auth" value={short(report.supply?.mintAuthority) ?? "Revoked"} bad={Boolean(report.supply?.mintAuthority)} />
          <DataRow label="Freeze auth" value={short(report.supply?.freezeAuthority) ?? "Revoked"} bad={Boolean(report.supply?.freezeAuthority)} />
          <DataRow label="Program" value={programLabel(report.identity?.tokenProgram)} />
          <DataRow label="Decimals" value={String(report.supply?.decimals ?? report.identity?.decimals ?? "—")} />
          <DataRow label="Supply" value={formatNumber(report.supply?.uiAmount)} />
        </PanelSection>

        {/* Trust */}
        <PanelSection title="Trust" className="mt-3">
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
        <PanelSection title="Risk Factors">
          {report.risk?.factors?.length ? (
            <div className="space-y-1.5">
              {report.risk.factors.map((factor, index) => (
                <div key={`${factor.key}-${index}`} className="flex items-start justify-between gap-2 rounded border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-200">{factor.label ?? "Risk factor"}</p>
                    {factor.detail && <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{factor.detail}</p>}
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
        <PanelSection title="Sources">
          <SourcesList sources={report.sources} fetchedAt={report.fetchedAt} />
        </PanelSection>
      </aside>
    </div>
  );
}

// ─── Pool Report Layout ─────────────────────────────────────────────────────

function PairReportLayout({
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

// ─── Discovery Panel ────────────────────────────────────────────────────────

function DiscoveryPanel({
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

// ─── Empty & Loading States ─────────────────────────────────────────────────

function EmptyState({ mode, onScanToken }: { mode: ScanMode; onScanToken: (mint: string) => void }) {
  return (
    <div className="h-full grid place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] text-lg text-zinc-500">
          ◇
        </div>
        <h2 className="text-base font-semibold text-zinc-200">
          {mode === "token" ? "Enter a token mint to scan" : "Enter a pool or token address"}
        </h2>
        <p className="mt-2 text-xs leading-5 text-zinc-500 max-w-sm mx-auto">
          {mode === "token"
            ? "Risk score, authority checks, market metrics, liquidity data, and provider health will appear here."
            : "Paste a Meteora DLMM pool address or a token mint from GMGN to find matching pools."}
        </p>
        {mode === "token" && (
          <div className="mt-4 flex justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.mint}
                type="button"
                onClick={() => onScanToken(ex.mint)}
                className="rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition hover:border-[var(--accent)]/40 hover:text-zinc-200"
              >
                {ex.label}
              </button>
            ))}
          </div>
        )}
        <p className="mt-6 text-[10px] text-zinc-500 max-w-xs mx-auto">
          Informational only. Scores flag detected risk, not safety or investment quality.
        </p>
      </div>
    </div>
  );
}

function getApiErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const error = (data as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return undefined;
  const code = (error as Record<string, unknown>).code;
  return typeof code === "string" ? code : undefined;
}

function poolReportFromDiscovery(report: PoolDiscoveryReport, selectedPoolAddress?: string | null): PoolReport {
  const pool =
    report.pools?.find((candidate) => candidate.poolAddress === selectedPoolAddress) ??
    report.primaryPool ??
    report.pools?.[0];
  return {
    kind: "pair",
    pair: pool,
    sources: report.sources,
    fetchedAt: report.fetchedAt,
  };
}

function getInitialDiscoveryPoolAddress(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const discovery = data as PoolDiscoveryReport;
  return discovery.primaryPool?.poolAddress ?? discovery.pools?.[0]?.poolAddress ?? null;
}

function LoadingState() {
  return (
    <div className="h-full grid place-items-center p-6" role="status" aria-live="polite" aria-label="Scanning providers">
      <div className="text-center">
        <div className="mx-auto mb-3 size-8 rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)] animate-spin" />
        <p className="text-xs text-zinc-400">Scanning providers…</p>
      </div>
    </div>
  );
}

// ─── Shared Presentational Components ───────────────────────────────────────

function PanelSection({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-100 tabular-nums truncate">{value}</p>
    </div>
  );
}

function DataRow({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-[var(--panel-border)] last:border-b-0">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span title={value} className={`text-[11px] font-medium tabular-nums text-right truncate max-w-[14rem] ${bad ? "text-red-300" : "text-zinc-200"}`}>
        {value}
      </span>
    </div>
  );
}

function RiskBadge({ level, score }: { level: RiskLevel; score: number }) {
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

function TokenSummaryCompact({ token }: { token?: PairToken }) {
  return (
    <div>
      <DataRow label="Name" value={token?.name ?? "—"} />
      <DataRow label="Symbol" value={token?.symbol ?? "—"} />
      <DataRow label="Amount" value={formatNumber(token?.amount)} />
      <DataRow label="Price" value={formatUsd(token?.priceUsd)} />
      <DataRow label="Decimals" value={numberOrDash(token?.decimals)} />
      <DataRow label="Verified" value={yesNo(token?.verified)} bad={token?.verified === false} />
    </div>
  );
}

function ModeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
        active
          ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30"
          : "text-zinc-500 hover:text-zinc-300 border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}
