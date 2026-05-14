"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { NewPairsTable } from "./NewPairsTable";

export function NewPairsHome() {
  const router = useRouter();

  const handleSelectPool = useCallback((address: string) => {
    router.push(`/pool/${encodeURIComponent(address)}`);
  }, [router]);

  return (
    <NewPairsTable
      onSelectPool={handleSelectPool}
    />
  );
}
