import type { ScanMode } from "@/lib/api-types";
import { SCAN_EXAMPLES } from "./examples";

export function EmptyState({ mode, onScanToken }: { mode: ScanMode; onScanToken: (mint: string) => Promise<void> }) {
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
            {SCAN_EXAMPLES.map((ex) => (
              <button
                key={ex.mint}
                type="button"
                onClick={() => void onScanToken(ex.mint)}
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

export function LoadingState() {
  return (
    <div className="h-full grid place-items-center p-6" role="status" aria-live="polite" aria-label="Scanning providers">
      <div className="text-center">
        <div className="mx-auto mb-3 size-8 rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)] animate-spin" />
        <p className="text-xs text-zinc-400">Scanning providers…</p>
      </div>
    </div>
  );
}
