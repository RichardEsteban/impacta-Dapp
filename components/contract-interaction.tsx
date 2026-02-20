"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/context/wallet-context";
import { invokeContract, type TransactionResult } from "@/lib/stellar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionResultPanel } from "@/components/transaction-result";
import {
  Loader2,
  Play,
  Plus,
  Trash2,
  FileCode2,
  Terminal,
  Braces,
} from "lucide-react";

export function ContractInteraction() {
  const { wallet } = useWallet();

  const [contractId, setContractId] = useState("");
  const [functionName, setFunctionName] = useState("");
  const [args, setArgs] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TransactionResult | null>(null);

  // Argument management
  const addArg = () => setArgs((prev) => [...prev, ""]);
  const removeArg = (index: number) =>
    setArgs((prev) => prev.filter((_, i) => i !== index));
  const updateArg = (index: number, value: string) =>
    setArgs((prev) => prev.map((a, i) => (i === index ? value : a)));

  // Invoke
  const handleInvoke = useCallback(async () => {
    if (!wallet) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await invokeContract({
        contractId: contractId.trim(),
        functionName: functionName.trim(),
        args: args.map((a) => a.trim()),
        publicKey: wallet.publicKey,
      });
      setResult(res);
    } catch (err) {
      setResult({
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [wallet, contractId, functionName, args]);

  const isValid = contractId.trim().length > 0 && functionName.trim().length > 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Form Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileCode2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Contract Interaction
            </h2>
            <p className="text-sm text-muted-foreground">
              Invoke Soroban smart contract functions on Testnet
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* Contract ID */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="contractId"
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              Contract ID
            </Label>
            <Input
              id="contractId"
              placeholder="C... (56 characters)"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="font-mono text-sm"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* Function Name */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="functionName"
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              Function Name
            </Label>
            <Input
              id="functionName"
              placeholder="e.g. initialize, transfer, balance"
              value={functionName}
              onChange={(e) => setFunctionName(e.target.value)}
              className="text-sm"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* Arguments */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Braces className="h-3.5 w-3.5 text-muted-foreground" />
                Arguments
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addArg}
                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {args.map((arg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-mono text-muted-foreground">
                    {i}
                  </span>
                  <Input
                    placeholder={`Arg ${i}: string, number, address, or boolean`}
                    value={arg}
                    onChange={(e) => updateArg(i, e.target.value)}
                    className="font-mono text-sm"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  {args.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeArg(i)}
                      aria-label={`Remove argument ${i}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Arguments are auto-detected: integers, booleans (true/false),
              Stellar addresses (G.../C...), or strings.
            </p>
          </div>

          {/* Invoke Button */}
          <Button
            onClick={handleInvoke}
            disabled={!wallet || !isValid || isLoading}
            className="mt-2 gap-2"
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isLoading ? "Invoking..." : "Invoke Contract"}
          </Button>

          {!wallet && (
            <p className="text-center text-sm text-muted-foreground">
              Connect your Freighter wallet to invoke contracts.
            </p>
          )}
        </div>
      </div>

      {/* Result */}
      {result && <TransactionResultPanel result={result} />}
    </div>
  );
}
