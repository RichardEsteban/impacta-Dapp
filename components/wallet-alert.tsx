"use client";

import { useWallet } from "@/context/wallet-context";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export function WalletAlert() {
  const { error, wallet, isInstalled } = useWallet();
  const [dismissed, setDismissed] = useState(false);

  // Show nothing if wallet is connected, no errors, and extension is installed
  if (wallet || dismissed) return null;

  const message = error
    ? error
    : !isInstalled
      ? "Freighter wallet extension not detected. Install it to send XLM payments."
      : null;

  if (!message) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <p className="flex-1 text-sm text-foreground leading-relaxed">{message}</p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Dismiss alert"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
