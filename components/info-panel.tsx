"use client";

import { useWallet } from "@/context/wallet-context";
import {
  HORIZON_URL,
  fundAccountWithFriendbot,
} from "@/lib/stellar";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Wallet,
  ExternalLink,
  Loader2,
  Banknote,
  Info,
  ShieldCheck,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";

export function InfoPanel() {
  const { wallet, balance, refreshBalance } = useWallet();
  const [funding, setFunding] = useState(false);
  const [fundResult, setFundResult] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleFund = async () => {
    if (!wallet) return;
    setFunding(true);
    setFundResult(null);
    const ok = await fundAccountWithFriendbot(wallet.publicKey);
    setFundResult(ok ? "¡Cuenta financiada exitosamente!" : "Error al financiar. Intenta de nuevo.");
    if (ok) await refreshBalance();
    setFunding(false);
  };

  const handleCopyAddress = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.publicKey);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 1500);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Wallet Status Card */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="relative px-5 py-4 border-b border-border/50">
          <div className="absolute inset-0 gradient-primary opacity-5" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-md">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              Estado de Wallet
            </h3>
          </div>
        </div>

        <div className="p-5">
          {wallet ? (
            <div className="flex flex-col gap-3">
              {/* Connected status */}
              <div className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <span className="text-sm font-semibold text-success">Conectado</span>
              </div>

              {/* Address */}
              <div className="rounded-xl bg-secondary/60 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground">Dirección</p>
                  <button
                    onClick={handleCopyAddress}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    {copiedAddress ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="break-all font-mono text-xs text-foreground leading-relaxed">
                  {wallet.publicKey}
                </p>
              </div>

              {/* Balance */}
              {balance && (
                <div className="rounded-xl bg-secondary/60 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Balance</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-bold text-foreground">
                      {parseFloat(balance).toFixed(2)}
                    </p>
                    <span className="text-sm font-semibold text-primary">XLM</span>
                  </div>
                </div>
              )}

              {/* Friendbot fund */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleFund}
                disabled={funding}
                className="gap-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all"
              >
                {funding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Banknote className="h-4 w-4 text-primary" />
                )}
                <span className="font-medium">Financiar con Friendbot</span>
              </Button>

              {fundResult && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                  fundResult.includes("exitosamente")
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}>
                  {fundResult.includes("exitosamente") ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0 text-center">✕</span>
                  )}
                  {fundResult}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-xl bg-secondary/40 p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                <Wallet className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Wallet no conectada
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Conecta tu wallet Freighter para comenzar a usar Impacta.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Network Info Card */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="relative px-5 py-4 border-b border-border/50">
          <div className="absolute inset-0 gradient-primary opacity-5" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-md">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              Red Stellar
            </h3>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div className="rounded-xl bg-secondary/60 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Servidor Horizon</p>
            <p className="break-all font-mono text-xs text-foreground">
              {HORIZON_URL}
            </p>
          </div>

          <a
            href="https://stellar.expert/explorer/testnet"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/40"
          >
            <ExternalLink className="h-4 w-4" />
            Explorador Stellar Expert
          </a>
        </div>
      </div>

      {/* Help Card */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Guía Rápida</h3>
          </div>
        </div>
        <div className="p-5">
          <ol className="flex flex-col gap-3">
            {[
              { step: 1, text: "Instala la extensión", link: { href: "https://www.freighter.app/", label: "Freighter" } },
              { step: 2, text: "Cambia a Testnet y conecta tu wallet" },
              { step: 3, text: "Financia tu cuenta con Friendbot" },
              { step: 4, text: "Ingresa una dirección de destino y monto" },
              { step: 5, text: "Envía XLM y visualiza la transacción" },
            ].map(({ step, text, link }) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full gradient-primary text-[11px] font-bold text-white shadow-sm">
                  {step}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                  {text}
                  {link && (
                    <>
                      {" "}
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                      >
                        {link.label}
                      </a>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
