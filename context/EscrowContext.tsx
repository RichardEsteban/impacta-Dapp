"use client";

/**
 * EscrowContext — global state for the active escrow in the current session.
 *
 * Provides:
 *  - The escrow object loaded from the API
 *  - Loading / error state
 *  - Actions: loadEscrow, refreshEscrow, clearEscrow
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Escrow } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EscrowState {
  escrow: Escrow | null;
  isLoading: boolean;
  error: string | null;
}

interface EscrowActions {
  loadEscrow: (id: string) => Promise<Escrow | null>;
  refreshEscrow: () => Promise<void>;
  clearEscrow: () => void;
}

type EscrowContextValue = EscrowState & EscrowActions;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const EscrowContext = createContext<EscrowContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function EscrowProvider({ children }: { children: ReactNode }) {
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEscrow = useCallback(async (id: string): Promise<Escrow | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/escrow/${id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al cargar el escrow");
      }
      const data: Escrow = await res.json();
      setEscrow(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshEscrow = useCallback(async () => {
    if (!escrow?.id) return;
    await loadEscrow(escrow.id);
  }, [escrow?.id, loadEscrow]);

  const clearEscrow = useCallback(() => {
    setEscrow(null);
    setError(null);
  }, []);

  const value = useMemo<EscrowContextValue>(
    () => ({
      escrow,
      isLoading,
      error,
      loadEscrow,
      refreshEscrow,
      clearEscrow,
    }),
    [escrow, isLoading, error, loadEscrow, refreshEscrow, clearEscrow]
  );

  return (
    <EscrowContext.Provider value={value}>{children}</EscrowContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEscrow(): EscrowContextValue {
  const ctx = useContext(EscrowContext);
  if (!ctx) {
    throw new Error("useEscrow must be used within an <EscrowProvider>.");
  }
  return ctx;
}
