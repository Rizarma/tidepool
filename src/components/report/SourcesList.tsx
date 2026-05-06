import type { SourceStatus } from "@/lib/api-types";

export function SourcesList({ sources, fetchedAt }: { sources?: SourceStatus[]; fetchedAt?: string }) {
  return (
    <>
      <div className="space-y-3">
        {sources?.map((source) => (
          <div key={source.provider} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-950/80 px-4 py-3">
            <div>
              <p className="text-sm font-medium capitalize text-stone-200">{source.provider.replaceAll("_", " ")}</p>
              <p className="text-xs text-stone-500">{source.success ? `${source.latencyMs ?? 0}ms` : source.error ?? "Failed"}</p>
            </div>
            <span className={source.success ? "text-emerald-300" : "text-red-300"}>{source.success ? "●" : "×"}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-stone-500">Fetched {fetchedAt ? new Date(fetchedAt).toLocaleString() : "now"}</p>
    </>
  );
}
