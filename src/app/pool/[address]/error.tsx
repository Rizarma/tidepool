"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Pool route error:", error);
  }, [error]);

  return (
    <div className="h-full grid place-items-center p-6" role="alert" aria-live="assertive">
      <div className="max-w-md text-center">
        <h2 className="text-base font-semibold text-zinc-200">Unable to load pool scan</h2>
        <p className="mt-2 text-xs text-zinc-400">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-4 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-[var(--background)] transition hover:bg-[var(--accent-dim)]"
          >
            Retry
          </button>
          <Link
            href="/"
            className="rounded border border-[var(--panel-border)] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:text-zinc-200"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
