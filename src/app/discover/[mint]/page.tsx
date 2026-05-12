import type { Metadata } from "next";
import DiscoveryRouteView from "@/components/report/DiscoveryRouteView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mint: string }>;
}): Promise<Metadata> {
  const { mint } = await params;
  const short = `${mint.slice(0, 4)}…${mint.slice(-4)}`;
  return {
    title: `Tidepool Pool Discovery | ${short}`,
    description: "Meteora DLMM pools discovered for this token mint.",
  };
}

export default async function DiscoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ mint: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { mint } = await params;
  const sp = await searchParams;
  const poolParam = sp.pool;
  const initialSelectedPool = Array.isArray(poolParam) ? poolParam[0] : poolParam ?? null;

  return <DiscoveryRouteView key={`${mint}-${initialSelectedPool ?? "default"}`} mint={mint.trim()} initialSelectedPool={initialSelectedPool} />;
}
