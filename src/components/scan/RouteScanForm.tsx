"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { fetchAddressResolution } from "@/lib/report-fetchers";

const LS_ADDRESS = "tidepool_last_address";

export function RouteScanForm() {
  const router = useRouter();

  // Single universal address input — restored lazily from localStorage
  const [address, setAddress] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(LS_ADDRESS) ?? "";
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(LS_ADDRESS, address);
  }, [address]);

  // Keyboard shortcut: `/` focuses input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      const trimmed = address.trim();
      if (!trimmed) {
        setError("Enter a pool or token address");
        return;
      }

      setLoading(true);
      try {
        const resolution = await fetchAddressResolution(trimmed);

        switch (resolution.primarySuggestion) {
          case "direct_pool_scan":
            router.push(`/pool/${encodeURIComponent(trimmed)}`);
            break;
          case "pool_discovery":
            router.push(
              `/discover/${encodeURIComponent(trimmed)}${
                resolution.primaryPoolAddress
                  ? `?pool=${encodeURIComponent(resolution.primaryPoolAddress)}`
                  : ""
              }`,
            );
            break;
          case "token_scan":
            router.push(`/token/${encodeURIComponent(trimmed)}`);
            break;
          default:
            setError("Could not resolve this address as a pool or token");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to resolve address";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [address, router],
  );

  const handleGoHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) {
        setAddress(text.trim());
        inputRef.current?.focus();
      }
    } catch {
      // Silently ignore — clipboard permission may be denied
    }
  }, []);

  return (
    <header className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--panel-bg)]">
      <div className="flex items-center gap-3 px-3 py-2 xl:px-4">
        {/* Brand */}
        <button
          type="button"
          onClick={handleGoHome}
          className="flex items-center gap-2 shrink-0 cursor-pointer group"
          aria-label="Go to homepage"
        >
          <Logo className="size-7 text-[var(--accent)] transition group-hover:text-[var(--accent-dim)]" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-300 hidden sm:inline transition group-hover:text-zinc-200">
            Tidepool
          </span>
        </button>

        <div className="h-5 w-px bg-[var(--panel-border)] shrink-0" />

        {/* Universal scan form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 items-center justify-center gap-2 min-w-0"
          aria-label="Scan address form"
        >
          <div className="relative flex flex-1 min-w-0 max-w-2xl items-center">
            <input
              ref={inputRef}
              id="address"
              aria-label="Pool or token address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Pool or token address…"
              className="w-full min-w-0 rounded border border-[var(--panel-border)] bg-[var(--background)] py-1.5 pl-3 pr-9 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => void handlePaste()}
              aria-label="Paste from clipboard"
              title="Paste from clipboard"
              className="absolute right-1 grid size-6 place-items-center rounded text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
            >
              <ClipboardIcon />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-8 min-w-16 shrink-0 rounded bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--background)] transition hover:bg-[var(--accent-dim)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "…" : "Scan"}
          </button>
        </form>

        {/* Status indicator */}
        <div className="h-5 w-px bg-[var(--panel-border)] shrink-0 hidden sm:block" />
        <div
          className="hidden sm:flex items-center gap-1.5 shrink-0"
          role="status"
          aria-live="polite"
        >
          <span
            className={`inline-block size-1.5 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-zinc-600"}`}
          />
          <span className="text-[10px] text-zinc-500">
            {loading ? "Resolving" : "Idle"}
          </span>
        </div>
      </div>

      {/* Error bar */}
      {error && (
        <div
          role="alert"
          className="border-t border-red-500/20 bg-red-500/5 px-4 py-1.5 text-xs text-red-300"
        >
          {error}
        </div>
      )}
    </header>
  );
}

function ClipboardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-3.5" fill="none">
      <path
        d="M7.25 4.25h-.9A2.1 2.1 0 0 0 4.25 6.35v8.3a2.1 2.1 0 0 0 2.1 2.1h7.3a2.1 2.1 0 0 0 2.1-2.1v-8.3a2.1 2.1 0 0 0-2.1-2.1h-.9"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7.75 5.75h4.5a1 1 0 0 0 1-1v-.5a1 1 0 0 0-1-1h-4.5a1 1 0 0 0-1 1v.5a1 1 0 0 0 1 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
