/**
 * Bottom bar showing current indicator config + settings trigger.
 *
 * Always visible at the bottom of the app shell.
 */

"use client";

import { useState } from "react";
import { useIndicatorConfig } from "./IndicatorConfigContext";
import { IndicatorSettings } from "./IndicatorSettings";

export function IndicatorBottomBar() {
  const { config } = useIndicatorConfig();
  const [showSettings, setShowSettings] = useState(false);

  const enabledIndicators = config.indicators.filter((i) => i.enabled !== false);
  const summary =
    enabledIndicators.length === 0
      ? "Indicators off"
      : `${config.timeframes.join(" · ")} · ${enabledIndicators.map((i) => `${i.type.toUpperCase()}(${i.period})`).join(" · ")}`;

  return (
    <>
      <div className="shrink-0 border-t border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">{summary}</span>
        <button
          onClick={() => setShowSettings(true)}
          className="rounded p-1 hover:bg-white/[0.04] text-zinc-400 transition-colors"
          aria-label="Indicator settings"
          title="Indicator settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
      {showSettings && <IndicatorSettings onClose={() => setShowSettings(false)} />}
    </>
  );
}
