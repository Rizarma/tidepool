import type { Metadata } from "next";
import { HomePageView } from "@/components/home/HomePageView";

export const metadata: Metadata = {
  title: "Tidepool | New Meteora Pools",
};

export default function HomePage() {
  return <HomePageView />;
}
