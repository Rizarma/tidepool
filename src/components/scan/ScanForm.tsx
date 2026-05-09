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
  onGoHome: () => void;
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
  onGoHome,
  poolInputRef,
}: ScanFormProps) {
  return (
    <header className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--panel-bg)]">
      <div className="flex items-center gap-3 px-3 py-2 xl:px-4">
        {/* Brand */}
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-2 shrink-0 cursor-pointer group"
          aria-label="Go to homepage"
        >
          <div className="grid size-7 place-items-center rounded bg-[var(--accent)] text-xs font-black text-[var(--background)] transition group-hover:bg-[var(--accent-dim)]">
            T
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300 hidden sm:inline transition group-hover:text-zinc-200">
            Tidepool
          </span>
        </button>

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
        <form onSubmit={onSubmit} className="flex flex-1 items-center justify-center gap-2 min-w-0" aria-label="Scan address form">
          {mode === "token" ? (
            <AddressInput
              id="mint"
              aria-label="Token mint address"
              value={mint}
              onChange={setMint}
              placeholder="Token mint address…"
            />
          ) : pairInputMode === "pool" ? (
            <AddressInput
              inputRef={poolInputRef}
              id="pool"
              aria-label="Meteora DLMM pool or token address"
              value={poolAddress}
              onChange={setPoolAddress}
              placeholder="Pool or token address…"
            />
          ) : (
            <div className="flex flex-1 max-w-2xl gap-1.5 min-w-0">
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
            className="min-h-8 min-w-16 shrink-0 rounded bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--background)] transition hover:bg-[var(--accent-dim)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
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

function AddressInput({
  id,
  inputRef,
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
}: {
  id: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label": string;
}) {
  async function pasteFromClipboard() {
    const clipboardText = await navigator.clipboard?.readText();

    if (clipboardText) {
      onChange(clipboardText.trim());
      inputRef?.current?.focus();
    }
  }

  return (
    <div className="relative flex flex-1 min-w-0 max-w-2xl items-center">
      <input
        ref={inputRef}
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 rounded border border-[var(--panel-border)] bg-[var(--background)] py-1.5 pl-3 pr-9 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => void pasteFromClipboard()}
        aria-label={`Paste ${ariaLabel.toLowerCase()} from clipboard`}
        title="Paste from clipboard"
        className="absolute right-1 grid size-6 place-items-center rounded text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
      >
        <ClipboardIcon />
      </button>
    </div>
  );
}

function ClipboardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-3.5" fill="none">
      <path
        d="M7.25 4.25h-.9A2.1 2.1 0 0 0 4.25 6.35v8.3a2.1 2.1 0 0 0 2.1 2.1h7.3a2.1 2.1 0 0 0 2.1-2.1v-8.3a2.1 2.1 0 0 0-2.1-2.1h-.9"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7.75 5.75h4.5a1 1 0 0 0 1-1v-.5a1 1 0 0 0-1-1h-4.5a1 1 0 0 0-1 1v.5a1 1 0 0 0 1 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
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
