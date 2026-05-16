"use client";

import type { PairToken } from "@/lib/api-types";
import { shortenAddress } from "@/lib/format";

// ─── Types ─────────────────────────────────────────────────────────────────

type AuthoritySource = "gmgn" | "solana" | "none";

interface AuthorityStatus {
  source: AuthoritySource;
  revoked: boolean;
  address?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveAuthority(
  renounced?: boolean,
  authority?: string | null,
): AuthorityStatus {
  // GMGN boolean takes precedence
  if (renounced === true) return { source: "gmgn", revoked: true };
  if (renounced === false) return { source: "gmgn", revoked: false };
  // Fall back to Solana RPC
  if (authority === null) return { source: "solana", revoked: true };
  if (authority != null) return { source: "solana", revoked: false, address: authority };
  return { source: "none", revoked: false };
}

function RevokedBadge() {
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

function ActiveBadge({ address }: { address?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-300">
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-red-500/10">
        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
      Active
      {address && (
        <span className="font-mono text-[10px] text-zinc-500" title={address}>
          {shortenAddress(address, 3, 3)}
        </span>
      )}
    </span>
  );
}

function UnknownBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-zinc-500/10">
        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
      Unknown
    </span>
  );
}

function YesNoBadge({ value }: { value?: boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-300">
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-red-500/10">
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
        Yes
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/10">
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        No
      </span>
    );
  }
  return <UnknownBadge />;
}

function NumberBadge({ value, suffix, decimals = 1 }: { value?: number; suffix?: string; decimals?: number }) {
  if (value == null) return <span className="text-xs text-zinc-500">—</span>;
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span className="text-xs font-medium tabular-nums text-zinc-200">
      {formatted}{suffix ? ` ${suffix}` : ""}
    </span>
  );
}

function PctBadge({ value, warnThreshold }: { value?: number; warnThreshold?: number }) {
  if (value == null) return <span className="text-xs text-zinc-500">—</span>;
  const pct = (value * 100).toFixed(1);
  const isWarn = warnThreshold != null && value > warnThreshold;
  return (
    <span className={`text-xs font-medium tabular-nums ${isWarn ? "text-amber-300" : "text-zinc-200"}`}>
      {pct}%
    </span>
  );
}

function SourceDot({ source }: { source: AuthoritySource }) {
  if (source === "none") return null;
  const color = source === "gmgn" ? "bg-amber-400/60" : "bg-blue-400/60";
  const label = source === "gmgn" ? "GMGN" : "On-chain";
  return (
    <span
      className={`ml-1 inline-block size-1.5 rounded-full ${color}`}
      title={`Source: ${label}`}
    />
  );
}

// ─── Info Icon ─────────────────────────────────────────────────────────────

function InfoIcon() {
  return (
    <svg
      className="size-3.5 text-zinc-600 group-hover:text-amber-400/70 transition-colors cursor-help shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function CriteriaLabel({ label, description }: { label: string; description: string }) {
  return (
    <span className="group inline-flex items-center gap-1.5 text-sm text-zinc-300" title={description}>
      {label}
      <InfoIcon />
    </span>
  );
}

// ─── Row Components ─────────────────────────────────────────────────────────

function AuthorityRow({
  label,
  description,
  tokenX,
  tokenY,
}: {
  label: string;
  description: string;
  tokenX: AuthorityStatus;
  tokenY: AuthorityStatus;
}) {
  const allSafe = tokenX.revoked && tokenY.revoked;
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr] gap-3 px-4 py-3 border-b border-white/[0.04] last:border-b-0 items-center">
      <span className="flex items-center gap-1.5">
        <CriteriaLabel label={label} description={description} />
        <SourceDot source={tokenX.source !== "none" ? tokenX.source : tokenY.source} />
      </span>
      <div>
        {tokenX.source === "none" ? <UnknownBadge /> : tokenX.revoked ? <RevokedBadge /> : <ActiveBadge address={tokenX.address} />}
      </div>
      <div>
        {tokenY.source === "none" ? <UnknownBadge /> : tokenY.revoked ? <RevokedBadge /> : <ActiveBadge address={tokenY.address} />}
      </div>
      <StandardCell good={allSafe && tokenX.source !== "none" && tokenY.source !== "none"} />
    </div>
  );
}

function BooleanRow({
  label,
  description,
  tokenX,
  tokenY,
  badWhenTrue,
}: {
  label: string;
  description: string;
  tokenX?: boolean;
  tokenY?: boolean;
  badWhenTrue?: boolean;
}) {
  const xBad = badWhenTrue ? tokenX === true : tokenX === false;
  const yBad = badWhenTrue ? tokenY === true : tokenY === false;
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr] gap-3 px-4 py-3 border-b border-white/[0.04] last:border-b-0 items-center">
      <CriteriaLabel label={label} description={description} />
      <div>{badWhenTrue ? <YesNoBadge value={tokenX} /> : <YesNoBadge value={tokenX} />}</div>
      <div>{badWhenTrue ? <YesNoBadge value={tokenY} /> : <YesNoBadge value={tokenY} />}</div>
      <StandardCell good={!xBad && !yBad} />
    </div>
  );
}

function NumberRow({
  label,
  description,
  tokenX,
  tokenY,
  suffix,
  decimals,
  warnThreshold,
}: {
  label: string;
  description: string;
  tokenX?: number;
  tokenY?: number;
  suffix?: string;
  decimals?: number;
  warnThreshold?: number;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr] gap-3 px-4 py-3 border-b border-white/[0.04] last:border-b-0 items-center">
      <CriteriaLabel label={label} description={description} />
      <NumberBadge value={tokenX} suffix={suffix} decimals={decimals} />
      <NumberBadge value={tokenY} suffix={suffix} decimals={decimals} />
      <StandardCell good={
        (warnThreshold == null || (tokenX != null && tokenX <= warnThreshold)) &&
        (warnThreshold == null || (tokenY != null && tokenY <= warnThreshold))
      } />
    </div>
  );
}

function PctRow({
  label,
  description,
  tokenX,
  tokenY,
  warnThreshold,
}: {
  label: string;
  description: string;
  tokenX?: number;
  tokenY?: number;
  warnThreshold?: number;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr] gap-3 px-4 py-3 border-b border-white/[0.04] last:border-b-0 items-center">
      <CriteriaLabel label={label} description={description} />
      <PctBadge value={tokenX} warnThreshold={warnThreshold} />
      <PctBadge value={tokenY} warnThreshold={warnThreshold} />
      <StandardCell good={
        (warnThreshold == null || (tokenX != null && tokenX <= warnThreshold)) &&
        (warnThreshold == null || (tokenY != null && tokenY <= warnThreshold))
      } />
    </div>
  );
}

function StandardCell({ good }: { good: boolean }) {
  return (
    <span className={`text-xs font-medium ${good ? "text-emerald-400/70" : "text-zinc-500"}`}>
      {good ? "✓ Safe" : "Check"}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function TokenAnalysisMatrix({
  tokenX,
  tokenY,
}: {
  tokenX?: PairToken;
  tokenY?: PairToken;
}) {
  const symbolX = tokenX?.symbol ?? "Token X";
  const symbolY = tokenY?.symbol ?? "Token Y";

  const xMint = resolveAuthority(tokenX?.renouncedMint, tokenX?.mintAuthority);
  const yMint = resolveAuthority(tokenY?.renouncedMint, tokenY?.mintAuthority);
  const xFreeze = resolveAuthority(tokenX?.renouncedFreeze, tokenX?.freezeAuthority);
  const yFreeze = resolveAuthority(tokenY?.renouncedFreeze, tokenY?.freezeAuthority);

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

        {/* Authority rows */}
        <AuthorityRow
          label="Mint Authority"
          description="If active, the dev can mint unlimited new tokens. Revoked = safe."
          tokenX={xMint}
          tokenY={yMint}
        />
        <AuthorityRow
          label="Freeze Authority"
          description="If active, the dev can freeze any wallet from trading. Revoked = safe."
          tokenX={xFreeze}
          tokenY={yFreeze}
        />

        {/* GMGN Security rows */}
        <BooleanRow
          label="CTO"
          description="Community Takeover — the original dev abandoned the project and the community took control."
          tokenX={tokenX?.ctoFlag}
          tokenY={tokenY?.ctoFlag}
        />
        <BooleanRow
          label="Honeypot"
          description="Token where buys work but sells always fail. Primarily applicable to BSC/Base chains; not applicable on Solana."
          tokenX={tokenX?.isHoneypot === "yes"}
          tokenY={tokenY?.isHoneypot === "yes"}
          badWhenTrue
        />
        <PctRow
          label="Top 10 Holders"
          description="Percentage of total supply held by the top 10 wallets. Above 50% means high concentration risk."
          tokenX={tokenX?.top10HolderRate}
          tokenY={tokenY?.top10HolderRate}
          warnThreshold={0.5}
        />
      </div>
    </div>
  );
}
