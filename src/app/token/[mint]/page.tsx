import type { Metadata } from "next";
import TokenRouteView from "@/components/report/TokenRouteView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mint: string }>;
}): Promise<Metadata> {
  const { mint } = await params;
  const short = `${mint.slice(0, 4)}…${mint.slice(-4)}`;
  return {
    title: `Tidepool Token Scan | ${short}`,
    description: "Solana token risk and market scan.",
  };
}

export default async function TokenPage({
  params,
}: {
  params: Promise<{ mint: string }>;
}) {
  const { mint } = await params;
  return <TokenRouteView key={mint} mint={mint} />;
}
