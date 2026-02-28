"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/context/wallet-context";
import { sendXLM, type TransactionResult } from "@/lib/stellar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionResultPanel } from "@/components/transaction-result";
import { Loader2, Send, ArrowUpRight, Coins, Wallet } from "lucide-react";

export function SendPayment() {
  const { wallet, refreshBalance } = useWallet();

  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TransactionResult | null>(null);

  const handleSend = useCallback(async () => {
    if (!wallet) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await sendXLM(
        destination.trim(),
        amount.trim(),
        wallet.publicKey
      );
      setResult(res);
      if (res.status === "success") {
        await refreshBalance();
      }
    } catch (err) {
      setResult({
        status: "error",
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
    }
  }, [wallet, destination, amount, refreshBalance]);

  const numericAmount = parseFloat(amount);
  const isValid =
    destination.trim().length === 56 &&
    destination.startsWith("G") &&
    !isNaN(numericAmount) &&
    numericAmount > 0;

  const isDestinationInvalid =
    destination.length > 0 &&
    (destination.length !== 56 || !destination.startsWith("G"));

  const isAmountInvalid = !!amount && (isNaN(numericAmount) || numericAmount <= 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Form Card */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        {/* Card Header with gradient accent */}
        <div className="relative px-6 py-5 border-b border-border/50">
          <div className="absolute inset-0 gradient-primary opacity-5" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-lg">
              <ArrowUpRight className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Enviar XLM
              </h2>
              <p className="text-xs text-muted-foreground">
                Transferencia directa en la red Stellar Testnet
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Destination Address */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="destination"
              className="flex items-center gap-2 text-sm font-semibold text-foreground"
            >
              <Send className="h-3.5 w-3.5 text-primary" />
              Dirección de Destino
            </Label>
            <div className="relative">
              <Input
                id="destination"
                placeholder="G... (clave pública Stellar de 56 caracteres)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className={`font-mono text-xs bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all pr-4 ${
                  isDestinationInvalid ? "border-destructive/50 focus:border-destructive/50" : ""
                } ${
                  destination.length === 56 && destination.startsWith("G")
                    ? "border-success/50 focus:border-success/50"
                    : ""
                }`}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            {isDestinationInvalid && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
                Debe ser una dirección Stellar de 56 caracteres comenzando con G
              </p>
            )}
            {destination.length === 56 && destination.startsWith("G") && (
              <p className="flex items-center gap-1.5 text-xs text-success">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                Dirección válida
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="amount"
              className="flex items-center gap-2 text-sm font-semibold text-foreground"
            >
              <Coins className="h-3.5 w-3.5 text-primary" />
              Monto (XLM)
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                min="0.0000001"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`text-sm bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all pr-16 ${
                  isAmountInvalid ? "border-destructive/50 focus:border-destructive/50" : ""
                }`}
                autoComplete="off"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="text-xs font-bold text-primary">XLM</span>
              </div>
            </div>
            {isAmountInvalid && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
                El monto debe ser un número positivo
              </p>
            )}
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!wallet || !isValid || isLoading}
            className="mt-1 gap-2 gradient-primary border-0 text-white font-semibold h-11 text-sm shadow-lg hover:opacity-90 transition-opacity disabled:opacity-40"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar XLM
              </>
            )}
          </Button>

          {!wallet && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-secondary/50 p-3">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <p className="text-center text-sm text-muted-foreground">
                Conecta tu wallet Freighter para enviar pagos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Result */}
      {result && <TransactionResultPanel result={result} />}
    </div>
  );
}
