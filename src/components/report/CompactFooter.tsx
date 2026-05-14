"use client";

import type { PoolReport, SourceStatus } from "@/lib/api-types";
import { SourcesList } from "@/components/report/SourcesList";

export function CompactFooter({
  pair,
  tags,
  sources,
  fetchedAt,
}: {
  pair?: PoolReport["pair"];
  tags?: string[];
  sources?: SourceStatus[];
  fetchedAt?: string;
}) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* ─── Tags ─── */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-white/[0.04] px-2 py-0.5 text-xs text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ─── Sources ─── */}
      {sources && sources.length > 0 && (
        <details className="inline-block">
          <summary className="text-xs text-zinc-500 cursor-pointer select-none list-none inline-flex items-center gap-1">
            Sources
            <span aria-hidden="true" className="text-zinc-600">▼</span>
          </summary>
          <div className="mt-2 min-w-[240px]">
            <SourcesList sources={sources} fetchedAt={fetchedAt} />
          </div>
        </details>
      )}

      {/* ─── Data age ─── */}
      {fetchedAt && (
        <span className="text-xs text-zinc-600">
          {new Date(fetchedAt).toLocaleString()}
        </span>
      )}
    </div>
  );
}
