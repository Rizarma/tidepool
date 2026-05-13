"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { IndicatorConfigProvider } from "@/components/indicators/IndicatorConfigContext";
import { IndicatorBottomBar } from "@/components/indicators/IndicatorBottomBar";
import { RouteScanForm } from "@/components/scan/RouteScanForm";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <IndicatorConfigProvider>
      <div className="flex flex-col h-full">
        <Suspense fallback={null}>
          <RouteScanForm key={pathname} />
        </Suspense>
        <main className="flex-1 min-h-0 overflow-auto">
          {children}
        </main>
        <IndicatorBottomBar />
      </div>
    </IndicatorConfigProvider>
  );
}
