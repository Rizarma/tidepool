import type { DlmmPairInfo, PairToken } from "@/lib/types";

export const SOL_MINT = "So11111111111111111111111111111111111111112";

export function getPrimaryToken(pair: DlmmPairInfo): PairToken {
  if (pair.tokenX.mint === SOL_MINT) return pair.tokenY;
  if (pair.tokenY.mint === SOL_MINT) return pair.tokenX;
  return pair.tokenX;
}

export function getAprClass(apr?: number): string {
  if (apr == null || Number.isNaN(apr)) return "text-zinc-500";
  if (apr > 150) return "text-rose-400 font-semibold";
  if (apr >= 50) return "text-amber-400 font-semibold";
  return "text-zinc-300";
}
