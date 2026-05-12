"use client";

import { useRouter } from "next/navigation";
import { NewPairsTable } from "./NewPairsTable";

export function NewPairsHome() {
  const router = useRouter();

  return (
    <NewPairsTable
      onSelectPool={(address) => router.push(`/pool/${encodeURIComponent(address)}`)}
    />
  );
}
