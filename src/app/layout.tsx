import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "./AppShell";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: "Tidepool | Solana Token Scanner",
  description: "Advanced risk and security screening for Solana tokens",
  openGraph: {
    title: "Tidepool | Solana Token Scanner",
    description: "Advanced risk and security screening for Solana tokens",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-full bg-[var(--background)] text-[var(--foreground)]">
        <AppShell>{children}</AppShell>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
