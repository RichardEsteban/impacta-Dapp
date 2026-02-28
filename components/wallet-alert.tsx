"use client";

import { useWallet } from "@/context/wallet-context";
import { AlertTriangle, X, ExternalLink } from "lucide-react";
import { useState } from "react";

export function WalletAlert() {
  const { error, wallet, isInstalled } = useWallet();
  const [dismissed, setDismissed] = useState(false);

  // Show nothing if wallet is connected, no errors, and extension is installed
  if (wallet || dismissed) return null;

  const message = error
    ? error
    : !isInstalled
      ? "Extensión Freighter no detectada. Instálala para enviar pagos XLM."
      : null;

  if (!message) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/5 p-4 backdrop-blur-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15">
        <AlertTriangle className="h-4 w-4 text-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-relaxed">{message}</p>
        {!isInstalled && (
          <a
            href="https://www.freighter.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Instalar Freighter
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        aria-label="Cerrar alerta"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
