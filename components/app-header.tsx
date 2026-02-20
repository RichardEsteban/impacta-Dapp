"use client";

import { useWallet } from "@/context/wallet-context";
import { NetworkBadge } from "@/components/network-badge";
import { WalletButton } from "@/components/wallet-button";
import { Zap } from "lucide-react";

export function AppHeader() {
  const { wallet, balance, displayAddress, isConnecting, connect, disconnect } =
    useWallet();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Impacta
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <NetworkBadge />
          <WalletButton
            connected={!!wallet}
            displayAddress={displayAddress}
            balance={balance}
            isConnecting={isConnecting}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>
      </div>
    </header>
  );
}
