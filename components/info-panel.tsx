"use client";

import { useWallet } from "@/context/wallet-context";
import {
  TESTNET_URL,
  HORIZON_URL,
  fundAccountWithFriendbot,
} from "@/lib/stellar";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Server,
  Wallet,
  ExternalLink,
  Loader2,
  Banknote,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

export function InfoPanel() {
  const { wallet, balance, refreshBalance } = useWallet();
  const [funding, setFunding] = useState(false);
  const [fundResult, setFundResult] = useState<string | null>(null);

  const handleFund = async () => {
    if (!wallet) return;
    setFunding(true);
    setFundResult(null);
    const ok = await fundAccountWithFriendbot(wallet.publicKey);
    setFundResult(ok ? "Funded successfully!" : "Funding failed. Try again.");
    if (ok) await refreshBalance();
    setFunding(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Wallet Status Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Wallet Status
          </h3>
        </div>

        {wallet ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">Connected</span>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <p className="mb-1 text-xs text-muted-foreground">Address</p>
              <p className="break-all font-mono text-xs text-foreground">
                {wallet.publicKey}
              </p>
            </div>
            {balance && (
              <div className="rounded-lg bg-secondary p-3">
                <p className="mb-1 text-xs text-muted-foreground">Balance</p>
                <p className="text-lg font-semibold text-foreground">
                  {parseFloat(balance).toFixed(2)}{" "}
                  <span className="text-sm text-muted-foreground">XLM</span>
                </p>
              </div>
            )}

            {/* Friendbot fund */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleFund}
              disabled={funding}
              className="gap-2"
            >
              {funding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Banknote className="h-4 w-4" />
              )}
              Fund with Friendbot
            </Button>
            {fundResult && (
              <p
                className={`text-xs ${
                  fundResult.includes("success")
                    ? "text-primary"
                    : "text-destructive"
                }`}
              >
                {fundResult}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg bg-secondary p-6 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Connect your Freighter wallet to get started.
            </p>
          </div>
        )}
      </div>

      {/* Network Info Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Network Info
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
            <Server className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                Soroban RPC
              </span>
              <span className="break-all font-mono text-xs text-foreground">
                {TESTNET_URL}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Horizon</span>
              <span className="break-all font-mono text-xs text-foreground">
                {HORIZON_URL}
              </span>
            </div>
          </div>

          <a
            href="https://stellar.expert/explorer/testnet"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary p-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            Stellar Expert Explorer
          </a>
        </div>
      </div>

      {/* Help Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Quick Guide</h3>
        </div>
        <ol className="flex flex-col gap-2 text-xs text-muted-foreground leading-relaxed">
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs text-foreground">
              1
            </span>
            Install the{" "}
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Freighter
            </a>{" "}
            wallet extension
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs text-foreground">
              2
            </span>
            Switch to Testnet and connect
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs text-foreground">
              3
            </span>
            Fund your account via Friendbot
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs text-foreground">
              4
            </span>
            Enter a contract ID and function
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs text-foreground">
              5
            </span>
            Add arguments and invoke
          </li>
        </ol>
      </div>
    </div>
  );
}
