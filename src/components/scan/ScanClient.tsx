"use client";

import { useScanController } from "./useScanController";
import { ScanForm } from "./ScanForm";
import { EmptyState, LoadingState } from "./EmptyState";
import { NewPairsTable } from "@/components/pairs/NewPairsTable";
import { TokenReportLayout } from "@/components/report/TokenReportLayout";
import { PairReportLayout } from "@/components/report/PairReportLayout";
import { poolReportFromDiscovery } from "@/components/report/pool-report-from-discovery";

export default function ScanClient() {
  const ctrl = useScanController();

  return (
    <div className="app-shell flex flex-col h-full">
      {/* ─── Command Bar ─────────────────────────────────────────────── */}
      <ScanForm
        mode={ctrl.mode}
        setMode={ctrl.setMode}
        pairInputMode={ctrl.pairInputMode}
        setPairInputMode={ctrl.setPairInputMode}
        mint={ctrl.mint}
        setMint={ctrl.setMint}
        poolAddress={ctrl.poolAddress}
        setPoolAddress={ctrl.setPoolAddress}
        mintA={ctrl.mintA}
        setMintA={ctrl.setMintA}
        mintB={ctrl.mintB}
        setMintB={ctrl.setMintB}
        loading={ctrl.loading}
        report={ctrl.report}
        error={ctrl.error}
        onSubmit={ctrl.onSubmit}
        scanToken={ctrl.scanToken}
        onGoHome={ctrl.clearScan}
        poolInputRef={ctrl.poolInputRef}
      />

      {/* ─── Main Content ────────────────────────────────────────────── */}
      <main className="app-main flex-1 min-h-0 overflow-auto xl:overflow-hidden">
        {ctrl.loading ? (
          <LoadingState />
        ) : !ctrl.report ? (
          ctrl.mode === "pair" ? (
            <NewPairsTable
              onSelectPool={(address) => {
                ctrl.setMode("pair");
                ctrl.setPairInputMode("pool");
                ctrl.setPoolAddress(address);
                void ctrl.scanPool(address);
              }}
            />
          ) : (
            <EmptyState mode={ctrl.mode} onScanToken={ctrl.scanToken} />
          )
        ) : ctrl.report.kind === "pair" ? (
          <PairReportLayout report={ctrl.report} />
        ) : ctrl.report.kind === "pool_discovery" ? (
          <PairReportLayout
            report={poolReportFromDiscovery(ctrl.report, ctrl.selectedPoolAddress)}
            discovery={ctrl.report}
            selectedPoolAddress={ctrl.selectedPoolAddress}
            onSelectPool={ctrl.setSelectedPoolAddress}
            onRunTokenScan={(mintAddress: string) => {
              ctrl.setMode("token");
              ctrl.setMint(mintAddress);
              void ctrl.scanToken(mintAddress);
            }}
          />
        ) : (
          <TokenReportLayout report={ctrl.report} />
        )}
      </main>
    </div>
  );
}
