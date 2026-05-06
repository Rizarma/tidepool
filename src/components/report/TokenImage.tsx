"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

export function TokenImage({ src, symbol, size = 40 }: { src?: string; symbol?: string; size?: number }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = useMemo(() => (symbol?.slice(0, 2) || "??").toUpperCase(), [symbol]);

  const sizeClass = size <= 32 ? "size-8" : size <= 40 ? "size-10" : "size-12";

  if (!src || failedSrc === src) {
    return (
      <div className={`${sizeClass} grid shrink-0 place-items-center rounded bg-[#1e2028] text-xs font-bold text-zinc-400`}>
        {initials}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={symbol ? `${symbol} token logo` : "Token logo"}
      width={size}
      height={size}
      unoptimized
      onError={() => setFailedSrc(src)}
      className={`${sizeClass} shrink-0 rounded object-cover ring-1 ring-[var(--panel-border)]`}
    />
  );
}
