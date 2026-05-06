import type { SourceStatus } from "@/lib/api-types";

export function SourcesList({ sources, fetchedAt }: { sources?: SourceStatus[]; fetchedAt?: string }) {
  return (
    <div className="space-y-0.5">
      {sources?.map((source) => (
        <div
          key={source.provider}
          className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-block size-1.5 rounded-full shrink-0 ${source.success ? "bg-emerald-400" : "bg-red-400"}`} />
            <span className="font-medium capitalize text-zinc-300 truncate">{source.provider.replaceAll("_", " ")}</span>
          </div>
          <span className="text-zinc-500 tabular-nums shrink-0">
            {source.success ? `${source.latencyMs ?? 0}ms` : source.error ?? "err"}
          </span>
        </div>
      ))}
      {fetchedAt && (
        <p className="pt-1.5 px-2 text-[10px] text-zinc-500">
          {new Date(fetchedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
