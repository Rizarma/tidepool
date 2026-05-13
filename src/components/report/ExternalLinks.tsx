"use client";

import type { PoolReport } from "@/lib/api-types";

export function ExternalLinks({
  pair,
  gmgnMint,
  jupiterUrl,
}: {
  pair?: PoolReport["pair"];
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

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
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
    </div>
  );
}
