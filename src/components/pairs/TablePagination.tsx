"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pageSizeOptions?: number[];
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  loading = false,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(page));
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and select input when entering edit mode
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  // Keyboard shortcuts: ArrowLeft/ArrowRight for prev/next (when no input focused)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (page > 1 && !loading) onPageChange(page - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (page < totalPages && !loading) onPageChange(page + 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page, totalPages, loading, onPageChange]);

  const commitPage = useCallback(() => {
    const n = parseInt(inputValue, 10);
    if (!Number.isNaN(n)) {
      const clamped = Math.max(1, Math.min(totalPages, n));
      onPageChange(clamped);
    }
    setEditing(false);
  }, [inputValue, totalPages, onPageChange]);

  const canGoBack = page > 1 && !loading;
  const canGoForward = page < totalPages && !loading;

  return (
    <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-t border-[var(--panel-border)] bg-[var(--panel-bg)]">
      {/* Left: Page size selector */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          Show
        </span>
        <div className="flex rounded border border-[var(--panel-border)] overflow-hidden">
          {pageSizeOptions.map((size) => (
            <button
              key={size}
              onClick={() => onPageSizeChange(size)}
              disabled={loading || size === pageSize}
              className={[
                "text-[11px] px-2 py-1 transition disabled:cursor-not-allowed",
                size === pageSize
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
              ].join(" ")}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Navigation */}
      <div className="flex items-center gap-1.5">
        <NavButton onClick={() => onPageChange(1)} disabled={!canGoBack} label="First">
          {"<<"}
        </NavButton>
        <NavButton onClick={() => onPageChange(page - 1)} disabled={!canGoBack} label="Previous">
          {"<"}
        </NavButton>

        <div className="flex items-center gap-1 px-2">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitPage();
                if (e.key === "Escape") {
                  setInputValue(String(page));
                  setEditing(false);
                }
              }}
              onBlur={commitPage}
              className="w-10 text-center text-xs tabular-nums bg-zinc-900 border border-zinc-600 rounded text-zinc-100 focus:outline-none focus:border-zinc-400"
            />
          ) : (
            <button
              onClick={() => {
                setInputValue(String(page));
                setEditing(true);
              }}
              className="text-xs tabular-nums text-zinc-300 hover:text-zinc-100 underline underline-offset-2 decoration-zinc-600 hover:decoration-zinc-400 transition"
              title="Click to jump to page"
            >
              {page}
            </button>
          )}
          <span className="text-xs text-zinc-500 tabular-nums">/ {totalPages}</span>
        </div>

        <NavButton onClick={() => onPageChange(page + 1)} disabled={!canGoForward} label="Next">
          {">"}
        </NavButton>
        <NavButton onClick={() => onPageChange(totalPages)} disabled={!canGoForward} label="Last">
          {">>"}
        </NavButton>
      </div>

      {/* Right: Loading indicator or item count */}
      <div className="w-24 text-right">
        {loading ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin" />
            Loading...
          </span>
        ) : total === 0 ? (
          <span className="text-[11px] text-zinc-500 tabular-nums">
            0 of 0
          </span>
        ) : (
          <span className="text-[11px] text-zinc-500 tabular-nums">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
        )}
      </div>
    </div>
  );
}

function NavButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        "text-xs px-2.5 py-1.5 min-w-[36px] rounded",
        "border border-[var(--panel-border)]",
        "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800",
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent",
        "transition-colors",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
