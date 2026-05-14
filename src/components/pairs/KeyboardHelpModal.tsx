"use client";

import { useEffect, useRef } from "react";

const SHORTCUTS = [
  { key: "?", action: "Open / close this help" },
  { key: "r", action: "Refresh pool data" },
  { key: "a", action: "Toggle auto-refresh" },
  { key: "Shift →", action: "Next page" },
  { key: "Shift ←", action: "Previous page" },
  { key: "Esc", action: "Close modal" },
];

interface KeyboardHelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardHelpModal({ open, onClose }: KeyboardHelpModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  // Focus close button when opening
  useEffect(() => {
    if (open && panelRef.current) {
      const closeBtn = panelRef.current.querySelector(
        'button[aria-label="Close help"]'
      ) as HTMLElement | null;
      closeBtn?.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm mx-4 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition"
            aria-label="Close help"
          >
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(({ key, action }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">{action}</span>
              <kbd className="inline-flex items-center justify-center rounded border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-[11px] font-mono text-zinc-300 min-w-[1.75rem] text-center">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
