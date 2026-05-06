"use client";

import { FormEvent, useState } from "react";

import type {
  PairInputMode,
  PairToken,
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
import { SourcesList } from "@/components/report/SourcesList";
import { TokenImage } from "@/components/report/TokenImage";

const EXAMPLES = [
  { label: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  { label: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
  { label: "BONK", mint: "DezXAZ8z7PnrnRJjz3kXBoF89VwXktvD9txB9kvpUMP" },
];

export default function ScanClient() {
  const [mint, setMint] = useState("");
  const [mode, setMode] = useState<ScanMode>("token");
  const [pairInputMode, setPairInputMode] = useState<PairInputMode>("pool");
  const [poolAddress, setPoolAddress] = useState("");
  const [mintA, setMintA] = useState("");
  const [mintB, setMintB] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function scanToken(nextMint = mint) {
    const trimmed = nextMint.trim();
    if (!trimmed) {
      setError("Paste a Solana mint address to scan.");
      return;
    }

    setMint(trimmed);
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch(`/api/scan?mint=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Scan failed");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  async function scanPair() {
    const trimmedPool = poolAddress.trim();
    const trimmedMintA = mintA.trim();
    const trimmedMintB = mintB.trim();

    if (pairInputMode === "pool" && !trimmedPool) {
      setError("Paste a Meteora DLMM pool address to scan.");
      return;
    }
    if (pairInputMode === "mints" && (!trimmedMintA || !trimmedMintB)) {
      setError("Paste both token mint addresses for the DLMM pair.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const query =
        pairInputMode === "pool"
          ? `pool=${encodeURIComponent(trimmedPool)}`
          : `mintA=${encodeURIComponent(trimmedMintA)}&mintB=${encodeURIComponent(trimmedMintB)}`;
      const response = await fetch(`/api/scan/pair?${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Pair scan failed");
      setPoolAddress(trimmedPool);
      setMintA(trimmedMintA);
      setMintB(trimmedMintB);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pair scan failed");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "token") void scanToken();
    else void scanPair();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(236,115,72,0.22),transparent_34rem),linear-gradient(135deg,#17130f_0%,#0d1117_50%,#16130d_100%)] text-stone-100">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <Header />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <section className="rounded-[2rem] border border-orange-200/15 bg-stone-950/55 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7">
            <p className="mb-3 w-fit rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">
              token + dlmm pair scanner
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-stone-50 sm:text-6xl lg:text-7xl">
              Solana pool scanner for LP due diligence.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
              Scan a token mint for risk signals, or scan a Meteora DLMM pool to inspect pair price, TVL, fees, and token ordering.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-3xl border border-stone-700/80 bg-black/35 p-1.5">
                <button
                  type="button"
                  onClick={() => setMode("token")}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] transition ${mode === "token" ? "bg-orange-300 text-stone-950" : "text-stone-400 hover:text-stone-100"}`}
                >
                  Token
                </button>
                <button
                  type="button"
                  onClick={() => setMode("pair")}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] transition ${mode === "pair" ? "bg-orange-300 text-stone-950" : "text-stone-400 hover:text-stone-100"}`}
                >
                  DLMM Pair
                </button>
              </div>

              {mode === "token" ? (
                <>
                  <label className="block text-sm font-medium text-stone-300" htmlFor="mint">
                    Token mint address
                  </label>
                  <div className="flex flex-col gap-3 rounded-3xl border border-stone-700/80 bg-black/35 p-2 sm:flex-row">
                    <input
                      id="mint"
                      value={mint}
                      onChange={(event) => setMint(event.target.value)}
                      placeholder="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                      className="min-h-14 flex-1 bg-transparent px-4 font-mono text-sm text-stone-100 outline-none placeholder:text-stone-600"
                      spellCheck={false}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="min-h-14 rounded-2xl bg-orange-300 px-6 text-sm font-bold uppercase tracking-[0.16em] text-stone-950 transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Scanning" : "Scan"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <ModeChip active={pairInputMode === "pool"} onClick={() => setPairInputMode("pool")}>Pool address</ModeChip>
                    <ModeChip active={pairInputMode === "mints"} onClick={() => setPairInputMode("mints")}>Token mints</ModeChip>
                  </div>
                  {pairInputMode === "pool" ? (
                    <div>
                      <label className="block text-sm font-medium text-stone-300" htmlFor="pool">
                        Meteora DLMM pool address
                      </label>
                      <div className="mt-2 flex flex-col gap-3 rounded-3xl border border-stone-700/80 bg-black/35 p-2 sm:flex-row">
                        <input
                          id="pool"
                          value={poolAddress}
                          onChange={(event) => setPoolAddress(event.target.value)}
                          placeholder="Pool address"
                          className="min-h-14 flex-1 bg-transparent px-4 font-mono text-sm text-stone-100 outline-none placeholder:text-stone-600"
                          spellCheck={false}
                        />
                        <button type="submit" disabled={loading} className="min-h-14 rounded-2xl bg-orange-300 px-6 text-sm font-bold uppercase tracking-[0.16em] text-stone-950 transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-60">
                          {loading ? "Scanning" : "Scan"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-stone-300">Token mint pair</label>
                      <input value={mintA} onChange={(event) => setMintA(event.target.value)} placeholder="Token A mint" className="min-h-14 w-full rounded-2xl border border-stone-700/80 bg-black/35 px-4 font-mono text-sm text-stone-100 outline-none placeholder:text-stone-600" spellCheck={false} />
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input value={mintB} onChange={(event) => setMintB(event.target.value)} placeholder="Token B mint" className="min-h-14 flex-1 rounded-2xl border border-stone-700/80 bg-black/35 px-4 font-mono text-sm text-stone-100 outline-none placeholder:text-stone-600" spellCheck={false} />
                        <button type="submit" disabled={loading} className="min-h-14 rounded-2xl bg-orange-300 px-6 text-sm font-bold uppercase tracking-[0.16em] text-stone-950 transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-60">
                          {loading ? "Scanning" : "Scan"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </form>

            {mode === "token" ? <div className="mt-5 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example.mint}
                  type="button"
                  onClick={() => void scanToken(example.mint)}
                  className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-stone-300 transition hover:border-orange-300/50 hover:text-orange-100"
                >
                  Try {example.label}
                </button>
              ))}
            </div> : null}

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <StatPill label="Token" value="Authority" />
              <StatPill label="Pair" value="Price + TVL" />
              <StatPill label="DLMM" value="Fees + bins" />
            </div>
          </section>

          <ReportPanel report={report} loading={loading} />
        </div>
      </section>
    </main>
  );
}

// ─── Layout sub-components ───────────────────────────────────────────────────

function Header() {
  return (
    <header className="relative flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-orange-300 text-lg font-black text-stone-950 shadow-lg shadow-orange-950/30">
          T
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-stone-200">Tidepool</p>
          <p className="text-xs text-stone-500">Solana risk scanner</p>
        </div>
      </div>
      <p className="hidden max-w-sm text-right text-xs leading-5 text-stone-500 sm:block">
        Informational only. Scores flag detected risk, not safety or investment quality.
      </p>
    </header>
  );
}

// ─── Report panels ───────────────────────────────────────────────────────────

function ReportPanel({ report, loading }: { report: ScanReport | null; loading: boolean }) {
  if (loading) return <LoadingReport />;
  if (!report) return <EmptyReport />;

  if ("kind" in report && report.kind === "pair") {
    return <PairReportPanel report={report} />;
  }

  const tokenReport = report as TokenReport;

  const name = tokenReport.identity?.name ?? tokenReport.identity?.symbol ?? "Unknown token";
  const score = tokenReport.risk?.score ?? 0;
  const level = tokenReport.risk?.level ?? "low";

  return (
    <section className="rounded-[2rem] border border-stone-700/80 bg-stone-950/70 p-4 shadow-2xl shadow-black/40 backdrop-blur sm:p-5">
      <div className="rounded-[1.55rem] border border-stone-800 bg-black/30 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <TokenImage src={tokenReport.identity?.imageUrl} symbol={tokenReport.identity?.symbol} />
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold tracking-[-0.04em] text-stone-50">{name}</h2>
              <p className="font-mono text-sm text-stone-500">{tokenReport.identity?.symbol ?? "—"}</p>
              <p className="mt-2 break-all font-mono text-xs text-stone-500">{tokenReport.identity?.mint}</p>
            </div>
          </div>
          <RiskBadge level={level} score={score} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Price" value={formatUsd(tokenReport.market?.priceUsd)} />
          <Metric label="Liquidity" value={formatUsd(tokenReport.market?.liquidity)} />
          <Metric label="24h volume" value={formatUsd(tokenReport.market?.volume24h)} />
          <Metric label="Market cap / FDV" value={formatUsd(tokenReport.market?.marketCap)} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Authority checks">
          <CheckRow label="Mint authority" value={short(tokenReport.supply?.mintAuthority) ?? "Revoked / none detected"} bad={Boolean(tokenReport.supply?.mintAuthority)} />
          <CheckRow label="Freeze authority" value={short(tokenReport.supply?.freezeAuthority) ?? "Revoked / none detected"} bad={Boolean(tokenReport.supply?.freezeAuthority)} />
          <CheckRow label="Token program" value={programLabel(tokenReport.identity?.tokenProgram)} />
          <CheckRow label="Decimals" value={String(tokenReport.supply?.decimals ?? tokenReport.identity?.decimals ?? "—")} />
          <CheckRow label="Supply" value={formatNumber(tokenReport.supply?.uiAmount)} />
        </Card>

        <Card title="Trust & liquidity">
          <CheckRow label="Jupiter strict" value={yesNo(tokenReport.trust?.jupiterStrict)} bad={tokenReport.trust?.jupiterStrict === false} />
          <CheckRow label="RugCheck level" value={tokenReport.trust?.rugCheckLevel ?? "Unavailable"} bad={isBadRugLevel(tokenReport.trust?.rugCheckLevel)} />
          <CheckRow label="RugCheck score" value={numberOrDash(tokenReport.trust?.rugCheckScore)} />
          <CheckRow label="Top holder" value={pct(tokenReport.trust?.topHolderPct)} bad={(tokenReport.trust?.topHolderPct ?? 0) > 20} />
          <CheckRow label="Main DEX" value={tokenReport.market?.dexId ?? "Unavailable"} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Risk factors">
          {tokenReport.risk?.factors?.length ? (
            <div className="space-y-3">
              {tokenReport.risk.factors.map((factor, index) => (
                <div key={`${factor.key}-${index}`} className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-stone-100">{factor.label ?? "Risk factor"}</p>
                    <span className="rounded-full bg-orange-300/15 px-2.5 py-1 text-xs font-bold text-orange-200">+{factor.weight ?? 0}</span>
                  </div>
                  {factor.detail ? <p className="mt-2 text-sm leading-6 text-stone-400">{factor.detail}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              No major risk factors detected by the current providers. This does not mean the token is safe.
            </p>
          )}
        </Card>

        <Card title="Sources">
          <SourcesList sources={tokenReport.sources} fetchedAt={tokenReport.fetchedAt} />
        </Card>
      </div>
    </section>
  );
}

function PairReportPanel({ report }: { report: PoolReport }) {
  const pair = report.pair;
  const tokenX = pair?.tokenX;
  const tokenY = pair?.tokenY;
  const symbolX = tokenX?.symbol ?? "Token X";
  const symbolY = tokenY?.symbol ?? "Token Y";
  const name = pair?.name ?? `${symbolX} / ${symbolY}`;

  return (
    <section className="rounded-[2rem] border border-stone-700/80 bg-stone-950/70 p-4 shadow-2xl shadow-black/40 backdrop-blur sm:p-5">
      <div className="rounded-[1.55rem] border border-stone-800 bg-black/30 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 w-fit rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">
              Meteora DLMM
            </p>
            <h2 className="truncate text-2xl font-semibold tracking-[-0.04em] text-stone-50">{name}</h2>
            <p className="mt-2 break-all font-mono text-xs text-stone-500">{pair?.poolAddress}</p>
          </div>
          <div className={`rounded-3xl border px-5 py-4 text-center ${pair?.isBlacklisted ? "border-red-300/30 bg-red-300/10 text-red-100" : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"}`}>
            <p className="text-sm font-black uppercase tracking-[0.16em]">{pair?.isBlacklisted ? "Blacklisted" : "Active"}</p>
            <p className="mt-1 text-xs text-current/75">Pool status</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="TVL" value={formatUsd(pair?.tvlUsd)} />
          <Metric label="24h volume" value={formatUsd(pair?.volume24h)} />
          <Metric label="24h fees" value={formatUsd(pair?.fees24h)} />
          <Metric label="Bin step" value={numberOrDash(pair?.binStep)} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Price">
          <div className="space-y-3">
            <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Token Y per Token X</p>
              <p className="mt-2 break-words text-2xl font-semibold text-stone-100">
                1 {symbolX} = {formatTokenPrice(pair?.priceTokenYPerTokenX)} {symbolY}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Inverse</p>
              <p className="mt-2 break-words text-xl font-semibold text-stone-100">
                1 {symbolY} = {formatTokenPrice(pair?.inversePrice)} {symbolX}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Pool fees">
          <CheckRow label="Base fee" value={feePct(pair?.baseFeePct)} />
          <CheckRow label="Dynamic fee" value={feePct(pair?.dynamicFeePct)} />
          <CheckRow label="Max fee" value={feePct(pair?.maxFeePct)} />
          <CheckRow label="Protocol fee" value={feePct(pair?.protocolFeePct)} />
          <CheckRow label="APR / APY" value={`${pctValue(pair?.apr)} / ${pctValue(pair?.apy)}`} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Token X">
          <TokenSummary token={tokenX} />
        </Card>
        <Card title="Token Y">
          <TokenSummary token={tokenY} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Tags">
          {pair?.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {pair.tags.map((tag) => <span key={tag} className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1.5 text-xs text-stone-300">{tag}</span>)}
            </div>
          ) : (
            <p className="text-sm text-stone-400">No tags reported by Meteora.</p>
          )}
        </Card>

        <Card title="Sources">
          <SourcesList sources={report.sources} fetchedAt={report.fetchedAt} />
        </Card>
      </div>
    </section>
  );
}

// ─── Shared presentational components ────────────────────────────────────────

function EmptyReport() {
  return (
    <section className="grid min-h-[34rem] place-items-center rounded-[2rem] border border-dashed border-stone-700/80 bg-stone-950/45 p-8 text-center backdrop-blur">
      <div className="max-w-md">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-[2rem] border border-orange-300/20 bg-orange-300/10 text-3xl">⌁</div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-stone-100">Awaiting mint address</h2>
        <p className="mt-3 text-sm leading-6 text-stone-400">
          Your report will show market liquidity, authority status, risk factors, provider health, and trust signals.
        </p>
      </div>
    </section>
  );
}

function LoadingReport() {
  return (
    <section className="rounded-[2rem] border border-stone-700/80 bg-stone-950/60 p-5 backdrop-blur">
      <div className="animate-pulse space-y-5">
        <div className="h-40 rounded-[1.5rem] bg-stone-800/70" />
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="h-64 rounded-[1.5rem] bg-stone-800/50" />
          <div className="h-64 rounded-[1.5rem] bg-stone-800/50" />
        </div>
        <div className="h-48 rounded-[1.5rem] bg-stone-800/40" />
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-stone-800 bg-black/25 p-4">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-stone-400">{title}</h3>
      {children}
    </section>
  );
}

function ModeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? "border-orange-300/60 bg-orange-300/15 text-orange-100" : "border-stone-700 bg-stone-900/80 text-stone-400 hover:text-stone-100"}`}
    >
      {children}
    </button>
  );
}

function TokenSummary({ token }: { token?: PairToken }) {
  return (
    <div>
      <div className="mb-4 rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
        <p className="text-2xl font-semibold tracking-[-0.04em] text-stone-100">{token?.symbol ?? "Unknown"}</p>
        <p className="mt-2 break-all font-mono text-xs text-stone-500">{token?.mint ?? "—"}</p>
      </div>
      <CheckRow label="Name" value={token?.name ?? "Unavailable"} />
      <CheckRow label="Amount" value={formatNumber(token?.amount)} />
      <CheckRow label="USD price" value={formatUsd(token?.priceUsd)} />
      <CheckRow label="Decimals" value={numberOrDash(token?.decimals)} />
      <CheckRow label="Verified" value={yesNo(token?.verified)} bad={token?.verified === false} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold text-stone-100">{value}</p>
    </div>
  );
}

function CheckRow({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-800 py-3 last:border-b-0">
      <span className="text-sm text-stone-400">{label}</span>
      <span className={`max-w-[13rem] break-all text-right text-sm font-medium ${bad ? "text-red-200" : "text-stone-100"}`}>{value}</span>
    </div>
  );
}

function RiskBadge({ level, score }: { level: RiskLevel; score: number }) {
  const styles: Record<RiskLevel, string> = {
    low: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    medium: "border-yellow-300/30 bg-yellow-300/10 text-yellow-100",
    high: "border-orange-300/30 bg-orange-300/10 text-orange-100",
    critical: "border-red-300/30 bg-red-300/10 text-red-100",
  };

  return (
    <div className={`rounded-3xl border px-5 py-4 text-center ${styles[level]}`}>
      <p className="text-4xl font-black tracking-[-0.08em]">{score}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em]">{level} risk</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-2 font-semibold text-stone-200">{value}</p>
    </div>
  );
}
