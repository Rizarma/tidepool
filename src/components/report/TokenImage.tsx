"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

export function TokenImage({ src, symbol }: { src?: string; symbol?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = useMemo(() => (symbol?.slice(0, 2) || "??").toUpperCase(), [symbol]);

  if (!src || failedSrc === src) {
    return <div className="grid size-16 shrink-0 place-items-center rounded-3xl bg-stone-800 text-lg font-black text-stone-300">{initials}</div>;
  }

  return (
    <Image
      src={src}
      alt=""
      width={64}
      height={64}
      unoptimized
      onError={() => setFailedSrc(src)}
      className="size-16 shrink-0 rounded-3xl object-cover ring-1 ring-stone-700"
    />
  );
}
