"use client";

import { useWallet } from "@/context/wallet-context";
import { NetworkBadge } from "@/components/network-badge";
import { WalletButton } from "@/components/wallet-button";
import { ShieldCheck } from "lucide-react";

export function AppHeader() {
  const { wallet, balance, displayAddress, isConnecting, connect, disconnect } =
    useWallet();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-lg">
            <ShieldCheck className="h-5 w-5 text-white" />
            <div className="absolute inset-0 rounded-xl glow-sm opacity-60" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight gradient-text">
              Impacta
            </span>
            <span className="hidden text-[10px] font-medium text-muted-foreground sm:block">
              Escrow Seguro · Stellar
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
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
