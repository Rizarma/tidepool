"use client";

import { IndicatorConfigProvider } from "@/components/indicators/IndicatorConfigContext";
import { IndicatorBottomBar } from "@/components/indicators/IndicatorBottomBar";
import { RouteScanForm } from "@/components/scan/RouteScanForm";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <IndicatorConfigProvider>
      <div className="flex flex-col h-full">
        <RouteScanForm />
        <main className="flex-1 min-h-0 overflow-auto">
          {children}
        </main>
        <IndicatorBottomBar />
      </div>
    </IndicatorConfigProvider>
  );
}
