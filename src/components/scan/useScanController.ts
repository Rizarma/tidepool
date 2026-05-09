"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import type {
  PairInputMode,
  PoolDiscoveryReport,
  ScanMode,
  ScanReport,
} from "@/lib/api-types";
import { parseApiError } from "@/lib/api-errors";

function getApiErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const error = (data as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return undefined;
  const code = (error as Record<string, unknown>).code;
  return typeof code === "string" ? code : undefined;
}

function getInitialDiscoveryPoolAddress(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const discovery = data as PoolDiscoveryReport;
  return discovery.primaryPool?.poolAddress ?? discovery.pools?.[0]?.poolAddress ?? null;
}

export interface ScanController {
  // State
  mint: string;
  mode: ScanMode;
  pairInputMode: PairInputMode;
  poolAddress: string;
  mintA: string;
  mintB: string;
  report: ScanReport | null;
  error: string | null;
  loading: boolean;
  selectedPoolAddress: string | null;

  // Setters
  setMint: (value: string) => void;
  setMode: (value: ScanMode) => void;
  setPairInputMode: (value: PairInputMode) => void;
  setPoolAddress: (value: string) => void;
  setMintA: (value: string) => void;
  setMintB: (value: string) => void;
  setSelectedPoolAddress: (value: string | null) => void;

  // Actions
  scanToken: (nextMint?: string) => Promise<void>;
  scanPool: (poolAddress: string) => Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;

  // Refs
  poolInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useScanController(): ScanController {
  const poolInputRef = useRef<HTMLInputElement>(null);
  const scanRequestIdRef = useRef(0);
  const [mint, setMint] = useState("");
  const [mode, setMode] = useState<ScanMode>("pair");
  const [pairInputMode, setPairInputMode] = useState<PairInputMode>("pool");
  const [poolAddress, setPoolAddress] = useState("");
  const [mintA, setMintA] = useState("");
  const [mintB, setMintB] = useState("");
  const [tokenReport, setTokenReport] = useState<ScanReport | null>(null);
  const [pairReport, setPairReport] = useState<ScanReport | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [pairError, setPairError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPoolAddress, setSelectedPoolAddress] = useState<string | null>(null);

  // Derive public report from current mode so existing consumers stay unchanged
  const report = mode === "token" ? tokenReport : pairReport;
  const error = mode === "token" ? tokenError : pairError;

  async function scanToken(nextMint = mint) {
    const requestId = ++scanRequestIdRef.current;
    const trimmed = nextMint.trim();
    if (!trimmed) {
      setTokenError("Paste a Solana mint address to scan.");
      return;
    }

    setMint(trimmed);
    setLoading(true);
    setTokenError(null);
    setTokenReport(null);
    // Preserve selectedPoolAddress across token scans

    try {
      const response = await fetch(`/api/scan?mint=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(parseApiError(data, "Scan failed"));
      if (requestId !== scanRequestIdRef.current) return;
      setTokenReport(data);
    } catch (err) {
      if (requestId !== scanRequestIdRef.current) return;
      setTokenError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      if (requestId === scanRequestIdRef.current) setLoading(false);
    }
  }

  async function scanPair() {
    const requestId = ++scanRequestIdRef.current;
    const trimmedPool = poolAddress.trim();
    const trimmedMintA = mintA.trim();
    const trimmedMintB = mintB.trim();

    if (pairInputMode === "pool" && !trimmedPool) {
      setPairError("Paste a Meteora DLMM pool address or token mint to scan.");
      return;
    }
    if (pairInputMode === "mints" && (!trimmedMintA || !trimmedMintB)) {
      setPairError("Paste both token mint addresses for the DLMM pool.");
      return;
    }

    setLoading(true);
    setPairError(null);
    setPairReport(null);
    setSelectedPoolAddress(null);
    // Do not clear tokenReport - preserve token scan results

    try {
      const query =
        pairInputMode === "pool"
          ? `pool=${encodeURIComponent(trimmedPool)}`
          : `mintA=${encodeURIComponent(trimmedMintA)}&mintB=${encodeURIComponent(trimmedMintB)}`;
      const response = await fetch(`/api/scan/pair?${query}`);
      const data = await response.json();

      if (!response.ok) {
        const code = getApiErrorCode(data);
        if (pairInputMode === "pool" && code === "NO_DATA_FOUND") {
          const discoveryResponse = await fetch(`/api/scan/pools?mint=${encodeURIComponent(trimmedPool)}`);
          const discoveryData = await discoveryResponse.json();

          if (!discoveryResponse.ok) {
            if (getApiErrorCode(discoveryData) === "NO_DATA_FOUND") {
              throw new Error("No Meteora DLMM pools found for this address. If this is a token mint, it may trade on another DEX. Try Token mode for broader token analysis.");
            }
            throw new Error(parseApiError(discoveryData, "Pool discovery failed"));
          }

          if (requestId !== scanRequestIdRef.current) return;
          setPoolAddress(trimmedPool);
          setSelectedPoolAddress(getInitialDiscoveryPoolAddress(discoveryData));
          setPairReport(discoveryData);
          return;
        }

        throw new Error(parseApiError(data, "Pool scan failed"));
      }

      if (requestId !== scanRequestIdRef.current) return;
      setPoolAddress(trimmedPool);
      setMintA(trimmedMintA);
      setMintB(trimmedMintB);
      setPairReport(data);
    } catch (err) {
      if (requestId !== scanRequestIdRef.current) return;
      setPairError(err instanceof Error ? err.message : "Pool scan failed");
    } finally {
      if (requestId === scanRequestIdRef.current) setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "token") void scanToken();
    else void scanPair();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (isTyping) return;

      event.preventDefault();
      setMode("pair");
      setPairInputMode("pool");
      requestAnimationFrame(() => {
        poolInputRef.current?.focus();
        poolInputRef.current?.select();
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function scanPool(poolAddr: string) {
    const requestId = ++scanRequestIdRef.current;
    const trimmed = poolAddr.trim();

    setLoading(true);
    setPairError(null);
    setPairReport(null);
    setSelectedPoolAddress(null);

    try {
      const response = await fetch(
        `/api/scan/pair?pool=${encodeURIComponent(trimmed)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(data, "Pool scan failed"));
      }

      if (requestId !== scanRequestIdRef.current) return;
      setPairReport(data);
    } catch (err) {
      if (requestId !== scanRequestIdRef.current) return;
      setPairError(err instanceof Error ? err.message : "Pool scan failed");
    } finally {
      if (requestId === scanRequestIdRef.current) setLoading(false);
    }
  }

  return {
    mint,
    mode,
    pairInputMode,
    poolAddress,
    mintA,
    mintB,
    report,
    error,
    loading,
    selectedPoolAddress,
    setMint,
    setMode,
    setPairInputMode,
    setPoolAddress,
    setMintA,
    setMintB,
    setSelectedPoolAddress,
    scanToken,
    scanPool,
    onSubmit,
    poolInputRef,
  };
}
