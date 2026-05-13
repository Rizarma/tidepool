import type { Metadata } from "next";
import PoolRouteView from "@/components/report/PoolRouteView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  const short = `${address.slice(0, 4)}…${address.slice(-4)}`;
  return {
    title: `Tidepool Pool Scan | ${short}`,
    description: "Meteora DLMM pool analysis, risk context, and indicators.",
  };
}

export default async function PoolPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return <PoolRouteView key={address} address={address} />;
}
