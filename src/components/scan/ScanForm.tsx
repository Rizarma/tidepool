"use client";

import type { FormEvent, RefObject } from "react";
import type { PairInputMode, ScanMode, ScanReport } from "@/lib/api-types";
import { SCAN_EXAMPLES } from "./examples";

export interface ScanFormProps {
  mode: ScanMode;
  setMode: (mode: ScanMode) => void;
  pairInputMode: PairInputMode;
  setPairInputMode: (mode: PairInputMode) => void;
  mint: string;
  setMint: (value: string) => void;
  poolAddress: string;
  setPoolAddress: (value: string) => void;
  mintA: string;
  setMintA: (value: string) => void;
  mintB: string;
  setMintB: (value: string) => void;
  loading: boolean;
  report: ScanReport | null;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  scanToken: (mint: string) => Promise<void>;
  poolInputRef: RefObject<HTMLInputElement | null>;
}

export function ScanForm({
  mode,
  setMode,
  pairInputMode,
  setPairInputMode,
  mint,
  setMint,
  poolAddress,
  setPoolAddress,
  mintA,
  setMintA,
  mintB,
  setMintB,
  loading,
  report,
  error,
  onSubmit,
  scanToken,
  poolInputRef,
}: ScanFormProps) {
  return (
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
              {SCAN_EXAMPLES.map((ex) => (
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
