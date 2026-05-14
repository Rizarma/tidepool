import type { DlmmPairInfo, PairToken } from "@/lib/types";

export const SOL_MINT = "So11111111111111111111111111111111111111112";

export function getPrimaryToken(pair: DlmmPairInfo): PairToken {
  if (pair.tokenX.mint === SOL_MINT) return pair.tokenY;
  if (pair.tokenY.mint === SOL_MINT) return pair.tokenX;
  return pair.tokenX;
}

export function getAprClass(apr?: number): string {
  if (apr == null || Number.isNaN(apr)) return "text-zinc-500";
  if (apr > 100) return "text-[var(--accent)] font-semibold";
  if (apr > 50) return "text-amber-300";
  if (apr > 20) return "text-zinc-300";
  return "text-zinc-500";
}
