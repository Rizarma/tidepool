"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";

type RiskLevel = "low" | "medium" | "high" | "critical";

type RiskFactor = {
  key?: string;
  label?: string;
  weight?: number;
  detail?: string;
};

type SourceStatus = {
  provider: string;
  success: boolean;
  latencyMs?: number;
  error?: string;
};

type TokenReport = {
  identity?: {
    mint?: string;
    name?: string;
    symbol?: string;
    decimals?: number;
    imageUrl?: string;
    tokenProgram?: string;
  };
  supply?: {
    total?: string;
    uiAmount?: number;
    decimals?: number;
    mintAuthority?: string | null;
    freezeAuthority?: string | null;
  };
  market?: {
    priceUsd?: number;
    priceNative?: number;
    marketCap?: number;
    volume24h?: number;
    liquidity?: number;
    pairAddress?: string;
    dexId?: string;
  };
  trust?: {
    jupiterStrict?: boolean;
    rugCheckScore?: number;
    rugCheckLevel?: string;
    topHolderPct?: number;
  };
  risk?: {
    score?: number;
    level?: RiskLevel;
    factors?: RiskFactor[];
  };
  sources?: SourceStatus[];
  fetchedAt?: string;
};

const EXAMPLES = [
  { label: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  { label: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
  { label: "BONK", mint: "DezXAZ8z7PnrnRJjz3kXBoF89VwXktvD9txB9kvpUMP" },
];

export default function Home() {
  const [mint, setMint] = useState("");
  const [report, setReport] = useState<TokenReport | null>(null);
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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void scanToken();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(236,115,72,0.22),transparent_34rem),linear-gradient(135deg,#17130f_0%,#0d1117_50%,#16130d_100%)] text-stone-100">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <Header />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <section className="rounded-[2rem] border border-orange-200/15 bg-stone-950/55 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7">
            <p className="mb-3 w-fit rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">
              single token poc
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-stone-50 sm:text-6xl lg:text-7xl">
              Solana token scanner for LP due diligence.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
              Paste a mint address. Tidepool pulls on-chain config, market liquidity, Jupiter status, and RugCheck signals into one explainable risk report.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
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
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <StatPill label="Signal" value="Authority" />
              <StatPill label="Signal" value="Liquidity" />
              <StatPill label="Signal" value="RugCheck" />
            </div>
          </section>

          <ReportPanel report={report} loading={loading} />
        </div>
      </section>
    </main>
  );
}

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

function ReportPanel({ report, loading }: { report: TokenReport | null; loading: boolean }) {
  if (loading) return <LoadingReport />;
  if (!report) return <EmptyReport />;

  const name = report.identity?.name ?? report.identity?.symbol ?? "Unknown token";
  const score = report.risk?.score ?? 0;
  const level = report.risk?.level ?? "low";

  return (
    <section className="rounded-[2rem] border border-stone-700/80 bg-stone-950/70 p-4 shadow-2xl shadow-black/40 backdrop-blur sm:p-5">
      <div className="rounded-[1.55rem] border border-stone-800 bg-black/30 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <TokenImage src={report.identity?.imageUrl} symbol={report.identity?.symbol} />
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold tracking-[-0.04em] text-stone-50">{name}</h2>
              <p className="font-mono text-sm text-stone-500">{report.identity?.symbol ?? "—"}</p>
              <p className="mt-2 break-all font-mono text-xs text-stone-500">{report.identity?.mint}</p>
            </div>
          </div>
          <RiskBadge level={level} score={score} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Price" value={formatUsd(report.market?.priceUsd)} />
          <Metric label="Liquidity" value={formatUsd(report.market?.liquidity)} />
          <Metric label="24h volume" value={formatUsd(report.market?.volume24h)} />
          <Metric label="Market cap / FDV" value={formatUsd(report.market?.marketCap)} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Authority checks">
          <CheckRow label="Mint authority" value={short(report.supply?.mintAuthority) ?? "Revoked / none detected"} bad={Boolean(report.supply?.mintAuthority)} />
          <CheckRow label="Freeze authority" value={short(report.supply?.freezeAuthority) ?? "Revoked / none detected"} bad={Boolean(report.supply?.freezeAuthority)} />
          <CheckRow label="Token program" value={programLabel(report.identity?.tokenProgram)} />
          <CheckRow label="Decimals" value={String(report.supply?.decimals ?? report.identity?.decimals ?? "—")} />
          <CheckRow label="Supply" value={formatNumber(report.supply?.uiAmount)} />
        </Card>

        <Card title="Trust & liquidity">
          <CheckRow label="Jupiter strict" value={yesNo(report.trust?.jupiterStrict)} bad={report.trust?.jupiterStrict === false} />
          <CheckRow label="RugCheck level" value={report.trust?.rugCheckLevel ?? "Unavailable"} bad={isBadRugLevel(report.trust?.rugCheckLevel)} />
          <CheckRow label="RugCheck score" value={numberOrDash(report.trust?.rugCheckScore)} />
          <CheckRow label="Top holder" value={pct(report.trust?.topHolderPct)} bad={(report.trust?.topHolderPct ?? 0) > 20} />
          <CheckRow label="Main DEX" value={report.market?.dexId ?? "Unavailable"} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Risk factors">
          {report.risk?.factors?.length ? (
            <div className="space-y-3">
              {report.risk.factors.map((factor, index) => (
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
          <div className="space-y-3">
            {report.sources?.map((source) => (
              <div key={source.provider} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-950/80 px-4 py-3">
                <div>
                  <p className="text-sm font-medium capitalize text-stone-200">{source.provider.replaceAll("_", " ")}</p>
                  <p className="text-xs text-stone-500">{source.success ? `${source.latencyMs ?? 0}ms` : source.error ?? "Failed"}</p>
                </div>
                <span className={source.success ? "text-emerald-300" : "text-red-300"}>{source.success ? "●" : "×"}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-stone-500">Fetched {report.fetchedAt ? new Date(report.fetchedAt).toLocaleString() : "now"}</p>
        </Card>
      </div>
    </section>
  );
}

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

function TokenImage({ src, symbol }: { src?: string; symbol?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = useMemo(() => (symbol?.slice(0, 2) || "??").toUpperCase(), [symbol]);

  if (!src || failed) {
    return <div className="grid size-16 shrink-0 place-items-center rounded-3xl bg-stone-800 text-lg font-black text-stone-300">{initials}</div>;
  }

  return (
    <Image
      src={src}
      alt=""
      width={64}
      height={64}
      unoptimized
      onError={() => setFailed(true)}
      className="size-16 shrink-0 rounded-3xl object-cover ring-1 ring-stone-700"
    />
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

function formatUsd(value?: number) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value < 0.01) return `$${value.toExponential(2)}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value > 1 ? 2 : 6 }).format(value);
}

function formatNumber(value?: number) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function short(value?: string | null) {
  if (!value) return undefined;
  return value.length > 12 ? `${value.slice(0, 5)}…${value.slice(-5)}` : value;
}

function yesNo(value?: boolean) {
  if (value == null) return "Unknown";
  return value ? "Yes" : "No";
}

function numberOrDash(value?: number) {
  return value == null ? "—" : String(value);
}

function pct(value?: number) {
  return value == null ? "Unavailable" : `${value.toFixed(1)}%`;
}

function programLabel(program?: string) {
  if (!program) return "Unknown";
  if (program === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") return "SPL Token";
  if (program === "TokenzQdBNbLqP5VEhdkAS6EPF5N5cwHho6pdjzZqK") return "Token-2022";
  return short(program) ?? program;
}

function isBadRugLevel(level?: string) {
  if (!level) return false;
  return /danger|critical|high|risky/i.test(level);
}
