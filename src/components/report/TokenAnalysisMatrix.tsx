"use client";

import type { PairToken } from "@/lib/api-types";
import { shortenAddress } from "@/lib/format";

function StatusCell({
  authority,
}: {
  authority?: string | null;
}) {
  const isRevoked = authority === null || authority === undefined;

  if (isRevoked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/10">
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        Revoked
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-300">
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-red-500/10">
        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
      Active
      <span className="font-mono text-[10px] text-zinc-500" title={authority}>
        {shortenAddress(authority, 3, 3)}
      </span>
    </span>
  );
}

function StandardCell({ good }: { good: boolean }) {
  return (
    <span className={`text-xs font-medium ${good ? "text-emerald-400/70" : "text-zinc-500"}`}>
      {good ? "✓ Should be Revoked" : "Should be Revoked"}
    </span>
  );
}

function MatrixRow({
  label,
  tokenXValue,
  tokenYValue,
}: {
  label: string;
  tokenXValue?: string | null;
  tokenYValue?: string | null;
}) {
  const xGood = tokenXValue === null || tokenXValue === undefined;
  const yGood = tokenYValue === null || tokenYValue === undefined;

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr] gap-3 px-4 py-3 border-b border-white/[0.04] last:border-b-0 items-center">
      <span className="text-sm text-zinc-300">{label}</span>
      <StatusCell authority={tokenXValue} />
      <StatusCell authority={tokenYValue} />
      <StandardCell good={xGood && yGood} />
    </div>
  );
}

export function TokenAnalysisMatrix({
  tokenX,
  tokenY,
}: {
  tokenX?: PairToken;
  tokenY?: PairToken;
}) {
  const symbolX = tokenX?.symbol ?? "Token X";
  const symbolY = tokenY?.symbol ?? "Token Y";

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-2">
        <svg className="size-4 text-amber-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        On-Chain Security Audit
      </h3>

      <div className="rounded-xl border border-amber-500/10 border-t-2 border-t-amber-500/20 bg-amber-500/[0.02] overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr] gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Criteria</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{symbolX}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{symbolY}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Standard</span>
        </div>

        {/* Data rows */}
        <MatrixRow
          label="Mint Authority"
          tokenXValue={tokenX?.mintAuthority}
          tokenYValue={tokenY?.mintAuthority}
        />
        <MatrixRow
          label="Freeze Authority"
          tokenXValue={tokenX?.freezeAuthority}
          tokenYValue={tokenY?.freezeAuthority}
        />
      </div>
    </div>
  );
}
