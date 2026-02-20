"use client";

import type { TransactionResult } from "@/lib/stellar";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Hash,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface TransactionResultPanelProps {
  result: TransactionResult;
}

export function TransactionResultPanel({ result }: TransactionResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const isSuccess = result.status === "success";

  const handleCopyHash = () => {
    if (result.hash) {
      navigator.clipboard.writeText(result.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      className={`rounded-xl border p-6 ${
        isSuccess
          ? "border-primary/30 bg-primary/5"
          : "border-destructive/30 bg-destructive/5"
      }`}
    >
      {/* Status header */}
      <div className="mb-4 flex items-center gap-3">
        {isSuccess ? (
          <CheckCircle2 className="h-6 w-6 text-primary" />
        ) : (
          <XCircle className="h-6 w-6 text-destructive" />
        )}
        <div>
          <h3
            className={`text-base font-semibold ${
              isSuccess ? "text-primary" : "text-destructive"
            }`}
          >
            {isSuccess ? "Transaction Successful" : "Transaction Failed"}
          </h3>
          {result.timestamp && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(result.timestamp).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Transaction Hash */}
        {result.hash && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-secondary/50 p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Hash className="h-3 w-3" />
              Transaction Hash
            </span>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all font-mono text-xs text-foreground">
                {result.hash}
              </code>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopyHash}
                  aria-label="Copy transaction hash"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="View on Stellar Expert"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            {copied && (
              <span className="text-xs text-primary">Copied to clipboard!</span>
            )}
          </div>
        )}

        {/* Error */}
        {result.error && (
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{result.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
