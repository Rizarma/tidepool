/**
 * Indicator settings modal.
 *
 * Lets the user toggle timeframes and adjust indicator periods.
 * Changes are applied via the IndicatorConfigContext.
 */

"use client";

import { useState } from "react";
import { useIndicatorConfig } from "./IndicatorConfigContext";
import { AVAILABLE_TIMEFRAMES } from "@/lib/indicator-config";

export function IndicatorSettings({ onClose }: { onClose: () => void }) {
  const { config, updateConfig } = useIndicatorConfig();

  // Local draft state — changes here don't affect global config until Apply
  const [draftTimeframes, setDraftTimeframes] = useState<string[]>(
    config.timeframes,
  );
  const [draftPeriod, setDraftPeriod] = useState(
    config.indicators[0]?.period ?? 20,
  );

  const handleToggleTimeframe = (tf: string) => {
    setDraftTimeframes((prev) => {
      const has = prev.includes(tf);
      if (has && prev.length === 1) {
        // Don't allow deselecting the last timeframe
        return prev;
      }
      return has ? prev.filter((t) => t !== tf) : [...prev, tf];
    });
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      setDraftPeriod(val);
    }
  };

  const handleApply = () => {
    updateConfig({
      timeframes: draftTimeframes,
      indicators: config.indicators.map((ind) =>
        ind.type === "sma" ? { ...ind, period: draftPeriod } : ind,
      ),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">
          Indicator Settings
        </h3>

        {/* Timeframes */}
        <div className="mb-4">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">
            Timeframes
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => handleToggleTimeframe(tf)}
                className={`rounded px-2 py-1 text-[10px] font-medium ${
                  draftTimeframes.includes(tf)
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-white/[0.04] text-zinc-500"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Period */}
        <div className="mb-4">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">
            SMA Period
          </p>
          <input
            type="number"
            value={draftPeriod}
            onChange={handlePeriodChange}
            min={1}
            max={200}
            className="w-full rounded border border-[var(--panel-border)] bg-[var(--background)] px-2 py-1 text-sm text-zinc-100"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleApply}
            className="flex-1 rounded bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300"
          >
            Apply
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
