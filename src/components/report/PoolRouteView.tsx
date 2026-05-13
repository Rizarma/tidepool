"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchPoolReport, fetchPoolDiscovery, ApiFetchError } from "@/lib/report-fetchers";
import type { PoolReport } from "@/lib/api-types";
import { PairReportLayout } from "./PairReportLayout";
import { LoadingState } from "@/components/scan/EmptyState";

export default function PoolRouteView({ address }: { address: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiFetchError | null>(null);
  const [report, setReport] = useState<PoolReport | null>(null);

  useEffect(() => {
    let stale = false;

    fetchPoolReport(address)
      .then((data) => {
        if (stale) return;
        setReport(data);
      })
      .catch(async (err) => {
        if (stale) return;
        if (err instanceof ApiFetchError && err.code === "NO_DATA_FOUND") {
          // Fallback: try discovery for the same address
          try {
            await fetchPoolDiscovery(address);
            if (!stale) {
              router.replace(`/discover/${encodeURIComponent(address)}`);
            }
          } catch {
            if (!stale) {
              setError(err);
            }
          }
        } else {
          setError(err instanceof ApiFetchError ? err : new ApiFetchError(String(err)));
        }
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });

    return () => {
      stale = true;
    };
  }, [address, router]);

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="h-full grid place-items-center p-6" role="alert" aria-live="polite">
        <div className="max-w-md text-center">
          <h2 className="text-base font-semibold text-zinc-200">Unable to load pool scan</h2>
          <p className="mt-2 text-xs text-zinc-500">{error.message}</p>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-[var(--background)] transition hover:bg-[var(--accent-dim)]"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/")}
              className="rounded border border-[var(--panel-border)] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:text-zinc-200"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return <LoadingState />;

  return <PairReportLayout report={report} />;
}
