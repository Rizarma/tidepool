"use client";

import type { DlmmPairInfo } from "@/lib/types";
import type { ColumnKey, Timeframe } from "./new-pairs-config";
import { NewPairCard } from "./NewPairCard";

interface NewPairsCardsProps {
  pools: DlmmPairInfo[];
  visibleColumns: Set<ColumnKey>;
  density: "compact" | "comfortable";
  timeframe: Timeframe;
  newPoolIds: Set<string>;
  onSelectPool: (poolAddress: string) => void;
}

export function NewPairsCards({
  pools,
  visibleColumns,
  density,
  timeframe,
  newPoolIds,
  onSelectPool,
}: NewPairsCardsProps) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2">
      {pools.map((pool) => (
        <NewPairCard
          key={pool.poolAddress}
          pool={pool}
          visibleColumns={visibleColumns}
          density={density}
          timeframe={timeframe}
          newPoolIds={newPoolIds}
          onSelectPool={onSelectPool}
        />
      ))}
    </div>
  );
}
