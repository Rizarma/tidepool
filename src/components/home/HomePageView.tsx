"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { NewPairsHome } from "@/components/pairs/NewPairsHome";
import { EmptyState } from "@/components/scan/EmptyState";

export function HomePageView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode");

  if (mode === "token") {
    return (
      <EmptyState
        mode="token"
        onScanToken={async (mint) => {
          router.push(`/token/${encodeURIComponent(mint)}`);
        }}
      />
    );
  }

  return <NewPairsHome />;
}
