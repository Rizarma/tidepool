"use client";

import type { PoolReport, SourceStatus } from "@/lib/api-types";
import { SourcesList } from "@/components/report/SourcesList";

export function CompactFooter({
  pair,
  tags,
  sources,
  fetchedAt,
  gmgnMint,
  jupiterUrl,
}: {
  pair?: PoolReport["pair"];
  tags?: string[];
  sources?: SourceStatus[];
  fetchedAt?: string;
  gmgnMint?: string;
  jupiterUrl?: string | null;
}) {
  const poolAddress = pair?.poolAddress;

  const links: { label: string; href: string }[] = [];

  if (poolAddress) {
    links.push({
      label: "Meteora",
      href: `https://app.meteora.ag/dlmm/${poolAddress}`,
    });
    links.push({
      label: "DexTools",
      href: `https://www.dextools.io/app/en/solana/pair-explorer/${poolAddress}`,
    });
    links.push({
      label: "DexScreener",
      href: `https://dexscreener.com/solana/${poolAddress}`,
    });
  }

  if (gmgnMint) {
    links.push({
      label: "GMGN",
      href: `https://gmgn.ai/sol/token/${gmgnMint}`,
    });
  }

  if (jupiterUrl) {
    links.push({
      label: "Jupiter",
      href: jupiterUrl,
    });
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* ─── Tags ─── */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-white/[0.04] px-2 py-0.5 text-xs text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ─── External links ─── */}
      {links.map(({ label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition"
        >
          {label}
          <span aria-hidden="true">↗</span>
        </a>
      ))}

      {/* ─── Sources ─── */}
      {sources && sources.length > 0 && (
        <details className="inline-block">
          <summary className="text-xs text-zinc-500 cursor-pointer select-none list-none inline-flex items-center gap-1">
            Sources
            <span aria-hidden="true" className="text-zinc-600">▼</span>
          </summary>
          <div className="mt-2 min-w-[240px]">
            <SourcesList sources={sources} fetchedAt={fetchedAt} />
          </div>
        </details>
      )}

      {/* ─── Data age ─── */}
      {fetchedAt && (
        <span className="text-xs text-zinc-600">
          {new Date(fetchedAt).toLocaleString()}
        </span>
      )}
    </div>
  );
}
