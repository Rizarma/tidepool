"use client";

import { Suspense } from "react";

import { IndicatorConfigProvider } from "@/components/indicators/IndicatorConfigContext";
import { IndicatorBottomBar } from "@/components/indicators/IndicatorBottomBar";
import { RouteScanForm } from "@/components/scan/RouteScanForm";
import { NewPairsPreferencesProvider } from "@/components/NewPairsPreferencesContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <IndicatorConfigProvider>
      <NewPairsPreferencesProvider>
        <div className="flex flex-col h-full">
          <Suspense fallback={null}>
            <RouteScanForm />
          </Suspense>
          <main className="flex-1 min-h-0 overflow-auto">
            {children}
          </main>
          <IndicatorBottomBar />
        </div>
      </NewPairsPreferencesProvider>
    </IndicatorConfigProvider>
  );
}
