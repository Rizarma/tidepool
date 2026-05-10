/**
 * Indicator settings modal.
 *
 * Lets the user toggle timeframes and enable/disable individual indicators
 * with configurable periods. Changes are applied via the
 * IndicatorConfigContext only on the "Apply" button click.
 */

"use client";

import { useState } from "react";
import { useIndicatorConfig } from "./IndicatorConfigContext";
import { AVAILABLE_TIMEFRAMES } from "@/lib/indicator-config";
import { getAvailableIndicators, getIndicator } from "@/lib/indicators/registry";

export function IndicatorSettings({ onClose }: { onClose: () => void }) {
  const { config, updateConfig } = useIndicatorConfig();

  // Local draft state — changes here don't affect global config until Apply
  const [draftTimeframes, setDraftTimeframes] = useState<string[]>(
    config.timeframes,
  );

  // Initialise draft indicators with all registered types so new indicators
  // automatically appear even if they weren't in the saved config.
  const [draftIndicators, setDraftIndicators] = useState(() => {
    const available = getAvailableIndicators();
    return available.map((type) => {
      const existing = config.indicators.find((i) => i.type === type);
      if (existing) return { ...existing };
      const def = getIndicator(type);
      return { type, period: def.defaultPeriod, enabled: false };
    });
  });

  const handleToggleTimeframe = (tf: string) => {
    setDraftTimeframes((prev) => {
      const has = prev.includes(tf);
      if (has && prev.length === 1) {
        // Don't allow deselecting the last timeframe
        return prev;
      }
      return has ? prev.filter((t) => t !== tf) : [...prev, t];
    });
  };

  const handleToggleIndicator = (type: string) => {
    setDraftIndicators((prev) =>
      prev.map((ind) =>
        ind.type === type ? { ...ind, enabled: !ind.enabled } : ind,
      ),
    );
  };

  const handlePeriodChange = (type: string, val: number) => {
    if (!isNaN(val) && val > 0) {
      setDraftIndicators((prev) =>
        prev.map((ind) =>
          ind.type === type ? { ...ind, period: val } : ind,
        ),
      );
    }
  };

  const handleApply = () => {
    updateConfig({
      timeframes: draftTimeframes,
      indicators: draftIndicators,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-80 max-h-[80vh] overflow-y-auto rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4"
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

        {/* Indicators */}
        <div className="mb-4 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Indicators
          </p>
          {draftIndicators.map((ind) => {
            const def = getIndicator(ind.type);
            return (
              <div
                key={ind.type}
                className="rounded border border-[var(--panel-border)] bg-[var(--background)] p-2.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-medium text-zinc-100">
                      {def.name}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {def.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleIndicator(ind.type)}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      ind.enabled
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/[0.04] text-zinc-500"
                    }`}
                  >
                    {ind.enabled ? "On" : "Off"}
                  </button>
                </div>
                {ind.enabled && (
                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                      Period
                    </p>
                    <input
                      type="number"
                      value={ind.period}
                      onChange={(e) =>
                        handlePeriodChange(ind.type, parseInt(e.target.value, 10))
                      }
                      min={1}
                      max={200}
                      className="w-full rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1 text-sm text-zinc-100"
                    />
                  </div>
                )}
              </div>
            );
          })}
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
