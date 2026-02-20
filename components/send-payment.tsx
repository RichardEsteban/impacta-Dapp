"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/context/wallet-context";
import { sendXLM, type TransactionResult } from "@/lib/stellar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionResultPanel } from "@/components/transaction-result";
import { Loader2, Send, ArrowUpRight, CircleDollarSign } from "lucide-react";

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
        error: err instanceof Error ? err.message : "Unknown error",
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

  return (
    <div className="flex flex-col gap-8">
      {/* Form Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ArrowUpRight className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Send XLM
            </h2>
            <p className="text-sm text-muted-foreground">
              Send native XLM to any Stellar address on Testnet
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* Destination Address */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="destination"
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <Send className="h-3.5 w-3.5 text-muted-foreground" />
              Destination Address
            </Label>
            <Input
              id="destination"
              placeholder="G... (56-character Stellar public key)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="font-mono text-sm"
              spellCheck={false}
              autoComplete="off"
            />
            {destination.length > 0 &&
              (destination.length !== 56 || !destination.startsWith("G")) && (
                <p className="text-xs text-destructive">
                  Must be a 56-character Stellar address starting with G
                </p>
              )}
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="amount"
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              Amount (XLM)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              min="0.0000001"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-sm"
              autoComplete="off"
            />
            {amount && (isNaN(numericAmount) || numericAmount <= 0) && (
              <p className="text-xs text-destructive">
                Amount must be a positive number
              </p>
            )}
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!wallet || !isValid || isLoading}
            className="mt-2 gap-2"
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isLoading ? "Sending..." : "Send XLM"}
          </Button>

          {!wallet && (
            <p className="text-center text-sm text-muted-foreground">
              Connect your Freighter wallet to send payments.
            </p>
          )}
        </div>
      </div>

      {/* Result */}
      {result && <TransactionResultPanel result={result} />}
    </div>
  );
}
