import type { PoolReport } from "@/lib/api-types";

export type RelatedPoolItem = NonNullable<NonNullable<PoolReport["relatedPools"]>[number]>;
export type PoolLike = NonNullable<PoolReport["pair"]> | RelatedPoolItem;
export type SortKey = "tvl" | "volume" | "apr";
export type SortDirection = "asc" | "desc";
