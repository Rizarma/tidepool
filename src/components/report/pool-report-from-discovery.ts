import type { PoolDiscoveryReport, PoolReport } from "@/lib/api-types";

export function poolReportFromDiscovery(report: PoolDiscoveryReport, selectedPoolAddress?: string | null): PoolReport {
  const pool =
    report.pools?.find((candidate) => candidate.poolAddress === selectedPoolAddress) ??
    report.primaryPool ??
    report.pools?.[0];
  return {
    kind: "pair",
    pair: pool,
    sources: report.sources,
    fetchedAt: report.fetchedAt,
  };
}
