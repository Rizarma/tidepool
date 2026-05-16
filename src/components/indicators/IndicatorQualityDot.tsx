export type IndicatorQuality = "full" | "partial" | "approximate" | "insufficient" | "unavailable";

export function QualityDot({ quality, tooltip }: { quality: IndicatorQuality; tooltip?: string }) {
  const colorClass =
    quality === "full"
      ? "bg-emerald-400"
      : quality === "partial" || quality === "approximate"
        ? "bg-amber-400"
        : quality === "insufficient"
          ? "bg-red-400"
          : "bg-zinc-600";

  return (
    <span
      className={`inline-block size-1.5 rounded-full ring-1 ring-white/10 ${colorClass}`}
      title={tooltip}
      aria-label={tooltip}
    />
  );
}
