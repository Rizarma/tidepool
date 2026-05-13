"use client";

import type { PairToken } from "@/lib/api-types";
import {
  formatCompactNumber,
  formatCompactUsd,
  formatNumber,
  formatUsd,
  shortenAddress,
} from "@/lib/format";
import { TerminalDataRow } from "@/components/report/report-atoms";
import { CopyButton } from "@/components/CopyButton";

export function TokenCard({
  token,
  label,
}: {
  token?: PairToken;
  label: "Token X" | "Token Y" | string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-5">
      {/* ─── Header ─── */}
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {label}
        </span>
        <span className="text-sm font-semibold text-zinc-100">
          {token?.symbol ?? "—"}
        </span>
        {token?.name && token.name !== token?.symbol && (
          <span className="text-xs text-zinc-500">{token.name}</span>
        )}
      </div>

      {/* ─── Data rows ─── */}
      <div>
        <TerminalDataRow
          label="Price USD"
          value={formatUsd(token?.priceUsd)}
        />
        <TerminalDataRow
          label="Market Cap"
          value={formatCompactUsd(token?.marketCap)}
        />
        <TerminalDataRow
          label="Reserve"
          value={formatNumber(token?.amount)}
        />
        {token?.holders !== undefined && (
          <TerminalDataRow
            label="Holders"
            value={formatCompactNumber(token.holders)}
          />
        )}
      </div>

      {/* ─── Mint ─── */}
      {token?.mint && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className="font-mono text-xs text-zinc-500"
            title={token.mint}
          >
            {shortenAddress(token.mint)}
          </span>
          <CopyButton address={token.mint} />
        </div>
      )}
    </div>
  );
}
