import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://tidepool.rizarma.com",
  ),
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
      <body className="h-full bg-[var(--background)] text-[var(--foreground)]">{children}</body>
    </html>
  );
}
