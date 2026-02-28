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
      className={`rounded-2xl border overflow-hidden ${
        isSuccess
          ? "border-success/20 bg-success/5"
          : "border-destructive/20 bg-destructive/5"
      }`}
    >
      {/* Status header */}
      <div className={`px-6 py-4 border-b ${
        isSuccess ? "border-success/15" : "border-destructive/15"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            isSuccess ? "bg-success/15" : "bg-destructive/15"
          }`}>
            {isSuccess ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
          </div>
          <div>
            <h3
              className={`text-base font-bold ${
                isSuccess ? "text-success" : "text-destructive"
              }`}
            >
              {isSuccess ? "¡Transacción Exitosa!" : "Transacción Fallida"}
            </h3>
            {result.timestamp && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                {new Date(result.timestamp).toLocaleString("es-PE")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-3">
        {/* Transaction Hash */}
        {result.hash && (
          <div className="flex flex-col gap-2 rounded-xl bg-secondary/50 p-4">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
              Hash de Transacción
            </span>
            <div className="flex items-start gap-2">
              <code className="flex-1 break-all font-mono text-xs text-foreground leading-relaxed">
                {result.hash}
              </code>
              <div className="flex shrink-0 items-center gap-1 mt-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={handleCopyHash}
                  aria-label="Copiar hash de transacción"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label="Ver en Stellar Expert"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            {copied && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                <CheckCircle2 className="h-3 w-3" />
                ¡Copiado al portapapeles!
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {result.error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
            <p className="text-sm text-destructive font-medium">{result.error}</p>
          </div>
        )}

        {/* View on explorer button */}
        {isSuccess && result.hash && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-success/20 bg-success/10 p-3 text-sm font-semibold text-success transition-all hover:bg-success/15 hover:border-success/30"
          >
            <ExternalLink className="h-4 w-4" />
            Ver en Stellar Expert
          </a>
        )}
      </div>
    </div>
  );
}
