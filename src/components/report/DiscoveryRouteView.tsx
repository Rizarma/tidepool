"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchPoolDiscovery, ApiFetchError } from "@/lib/report-fetchers";
import type { PoolDiscoveryReport } from "@/lib/api-types";
import { poolReportFromDiscovery } from "./pool-report-from-discovery";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { PairReportLayout } from "./PairReportLayout";
import { LoadingState } from "@/components/scan/EmptyState";

export default function DiscoveryRouteView({
  mint,
  initialSelectedPool,
}: {
  mint: string;
  initialSelectedPool: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiFetchError | null>(null);
  const [discovery, setDiscovery] = useState<PoolDiscoveryReport | null>(null);
  const [selectedPoolAddress, setSelectedPoolAddress] = useState<string | null>(initialSelectedPool);

  useEffect(() => {
    let stale = false;

    fetchPoolDiscovery(mint)
      .then((data) => {
        if (stale) return;
        setDiscovery(data);
      })
      .catch((err) => {
        if (stale) return;
        setError(err instanceof ApiFetchError ? err : new ApiFetchError(String(err)));
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });

    return () => {
      stale = true;
    };
  }, [mint]);

  // Derive validated selected pool from discovery + user selection
  const selectedAddress = useMemo(() => {
    if (!discovery?.pools?.length) return null;
    if (selectedPoolAddress && discovery.pools.some((p) => p.poolAddress === selectedPoolAddress)) {
      return selectedPoolAddress;
    }
    return discovery.primaryPool?.poolAddress ?? discovery.pools[0]?.poolAddress ?? null;
  }, [discovery, selectedPoolAddress]);

  const handleSelectPool = useCallback(
    (address: string) => {
      setSelectedPoolAddress(address);
      router.replace(`/discover/${encodeURIComponent(mint)}?pool=${encodeURIComponent(address)}`, { scroll: false });
    },
    [mint, router],
  );

  const handleRunTokenScan = useCallback(
    (discoveredMint: string) => {
      router.push(`/token/${encodeURIComponent(discoveredMint)}`);
    },
    [router],
  );

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="h-full grid place-items-center p-6" role="alert" aria-live="polite">
        <div className="max-w-md text-center">
          <h2 className="text-base font-semibold text-zinc-200">Unable to discover pools</h2>
          <p className="mt-2 text-xs text-zinc-500">{error.message}</p>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-[var(--background)] transition hover:bg-[var(--accent-dim)]"
            >
              Retry
            </button>
            <button
              onClick={() => router.push(`/token/${encodeURIComponent(mint)}`)}
              className="rounded border border-[var(--panel-border)] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:text-zinc-200"
            >
              Run token scan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!discovery) return <LoadingState />;

  const pairReport = poolReportFromDiscovery(discovery, selectedAddress);

  return (
    <div className="p-4">
      <DiscoveryPanel
        discovery={discovery}
        selectedPoolAddress={selectedAddress}
        onSelectPool={handleSelectPool}
        onRunTokenScan={handleRunTokenScan}
      />
      <PairReportLayout report={pairReport} />
    </div>
  );
}
