"use client";

import type { PairToken } from "@/lib/api-types";
import { shortenAddress } from "@/lib/format";

function AuthorityRow({
  label,
  authority,
}: {
  label: string;
  authority?: string | null;
}) {
  const isRevoked = authority === null || authority === undefined;
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-b-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        {isRevoked ? (
          <>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Revoked
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-300">
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Active
            </span>
            <span
              className="font-mono text-[10px] text-zinc-500"
              title={authority}
            >
              {shortenAddress(authority, 4, 4)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function AuditCard({
  token,
  label,
}: {
  token?: PairToken;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.02] p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <svg className="size-4 text-amber-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <span className="rounded bg-amber-500/[0.08] px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-300/90">
          {label}
        </span>
        <span className="text-sm font-semibold text-zinc-100">
          {token?.symbol ?? "—"}
        </span>
      </div>

      {/* Criteria rows */}
      <AuthorityRow label="Mint Authority" authority={token?.mintAuthority} />
      <AuthorityRow label="Freeze Authority" authority={token?.freezeAuthority} />
    </div>
  );
}

export function TokenAnalysisCards({
  tokenX,
  tokenY,
}: {
  tokenX?: PairToken;
  tokenY?: PairToken;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-2">
        <svg className="size-4 text-amber-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        Security Audit
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AuditCard token={tokenX} label="Token X" />
        <AuditCard token={tokenY} label="Token Y" />
      </div>
    </div>
  );
}
