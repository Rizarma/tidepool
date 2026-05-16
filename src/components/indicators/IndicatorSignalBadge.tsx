import type { IndicatorSignal } from "./indicator-view-model";

export function SignalBadge({ signal }: { signal: IndicatorSignal }) {
  if (signal === "unavailable") return null;

  if (signal === "long" || signal === "bullish") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1 py-0.5 text-[10px] font-medium text-emerald-300">
        ▲ {signal === "long" ? "LONG" : "BULLISH"}
      </span>
    );
  }

  if (signal === "short" || signal === "bearish") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded bg-red-500/15 px-1 py-0.5 text-[10px] font-medium text-red-300">
        ▼ {signal === "short" ? "SHORT" : "BEARISH"}
      </span>
    );
  }

  return (
    <span className="text-[10px] font-medium text-zinc-500">
      FLAT
    </span>
  );
}
