"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  connectWallet as connectWalletLib,
  getAccountBalance,
  isFreighterInstalled,
  shortenAddress,
  type WalletInfo,
} from "@/lib/stellar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WalletState {
  /** Whether the extension is present */
  isInstalled: boolean;
  /** Whether we are currently connecting */
  isConnecting: boolean;
  /** Connected account info (null when disconnected) */
  wallet: WalletInfo | null;
  /** Native XLM balance (null until fetched) */
  balance: string | null;
  /** Last error message */
  error: string | null;
  /** Shortened version of the public key */
  displayAddress: string;
}

interface WalletActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

type WalletContextValue = WalletState & WalletActions;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WalletContext = createContext<WalletContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for Freighter on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const installed = await isFreighterInstalled();
      if (!cancelled) setIsInstalled(installed);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch balance when wallet changes
  const refreshBalance = useCallback(async () => {
    if (!wallet?.publicKey) return;
    const bal = await getAccountBalance(wallet.publicKey);
    setBalance(bal);
  }, [wallet?.publicKey]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  // Connect
  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const info = await connectWalletLib();
      setWallet(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    setWallet(null);
    setBalance(null);
    setError(null);
  }, []);

  const displayAddress = useMemo(
    () => (wallet?.publicKey ? shortenAddress(wallet.publicKey, 6) : ""),
    [wallet?.publicKey]
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      isInstalled,
      isConnecting,
      wallet,
      balance,
      error,
      displayAddress,
      connect,
      disconnect,
      refreshBalance,
    }),
    [
      isInstalled,
      isConnecting,
      wallet,
      balance,
      error,
      displayAddress,
      connect,
      disconnect,
      refreshBalance,
    ]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a <WalletProvider>.");
  }
  return ctx;
}
