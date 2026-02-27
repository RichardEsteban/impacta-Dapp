"use client";

/**
 * /dashboard — Seller dashboard
 *
 * Shows all escrows created by the connected wallet (seller).
 * Each row shows:
 *   - Description
 *   - Amount (XLM)
 *   - Status badge
 *   - Deadline
 *   - Actions:
 *     - Copy payment link
 *     - View escrow page
 *     - Request release (seller + arbiter) if funded and past deadline
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "@/context/wallet-context";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import type { Escrow } from "@/lib/supabase";
import {
  buildReleaseTransaction,
  NETWORK_PASSPHRASE,
} from "@/lib/stellar/escrow";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  pending: "Esperando pago",
  funded: "Fondos recibidos",
  delivered: "Entregado",
  released: "Liberado",
  refunded: "Reembolsado",
  disputed: "En disputa",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  funded: "default",
  delivered: "default",
  released: "outline",
  refunded: "destructive",
  disputed: "destructive",
};

function isPastDeadline(createdAt: string, days: number): boolean {
  const deadline = new Date(createdAt);
  deadline.setDate(deadline.getDate() + days);
  return new Date() > deadline;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Escrow row component
// ---------------------------------------------------------------------------

function EscrowRow({
  escrow,
  walletPublicKey,
  onReleaseSuccess,
}: {
  escrow: Escrow;
  walletPublicKey: string;
  onReleaseSuccess: (updated: Escrow) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const payLink = escrow.payment_link ?? `${window.location.origin}/pay/${escrow.id}`;
  const canSellerRelease =
    escrow.status === "funded" &&
    isPastDeadline(escrow.created_at, escrow.deadline_days);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(payLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Seller requests release after deadline (seller + arbiter co-sign)
  const handleSellerRelease = async () => {
    setIsReleasing(true);
    setReleaseError(null);
    try {
      // 1. Build release tx
      const xdr = await buildReleaseTransaction(
        escrow.escrow_public_key,
        escrow.seller_address,
        Number(escrow.amount_xlm)
      );

      // 2. Seller signs via Freighter
      const freighter = await import("@stellar/freighter-api");
      const signResult = await freighter.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      const signResultObj =
        typeof signResult === "string"
          ? { signedTxXdr: signResult, error: "" }
          : signResult;

      if (signResultObj.error) {
        throw new Error(signResultObj.error ?? "Firma rechazada");
      }

      // 3. Backend (arbiter) co-signs and submits
      const res = await fetch(`/api/escrow/${escrow.id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXDR: signResultObj.signedTxXdr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al liberar fondos");

      onReleaseSuccess(data as Escrow);
    } catch (err) {
      setReleaseError(
        err instanceof Error ? err.message : "Error desconocido"
      );
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{escrow.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Creado {formatDate(escrow.created_at)}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[escrow.status]} className="shrink-0">
          {STATUS_LABELS[escrow.status]}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Monto </span>
          <span className="font-mono font-semibold text-primary">
            {Number(escrow.amount_xlm).toFixed(2)} XLM
          </span>
        </div>
        {escrow.buyer_address && (
          <div>
            <span className="text-muted-foreground text-xs">Comprador </span>
            <span className="font-mono text-xs">
              {escrow.buyer_address.slice(0, 6)}…{escrow.buyer_address.slice(-4)}
            </span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground text-xs">Plazo </span>
          <span className="text-xs">{escrow.deadline_days}d</span>
        </div>
      </div>

      {releaseError && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{releaseError}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={handleCopy}
        >
          {copied ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copiado" : "Copiar link"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          asChild
        >
          <Link href={`/pay/${escrow.id}`} target="_blank">
            <ExternalLink className="h-3.5 w-3.5" />
            Ver escrow
          </Link>
        </Button>

        {canSellerRelease && (
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleSellerRelease}
            disabled={isReleasing}
          >
            {isReleasing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {isReleasing ? "Liberando..." : "Liberar fondos"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { wallet, connect, isConnecting } = useWallet();

  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadEscrows = useCallback(async () => {
    if (!wallet?.publicKey) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/escrow/seller?address=${encodeURIComponent(wallet.publicKey)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar escrows");
      setEscrows(data as Escrow[]);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [wallet?.publicKey]);

  useEffect(() => {
    if (wallet?.publicKey) {
      loadEscrows();
    }
  }, [wallet?.publicKey, loadEscrows]);

  const handleReleaseSuccess = useCallback((updated: Escrow) => {
    setEscrows((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
  }, []);

  // Status buckets
  const activeEscrows = escrows.filter((e) =>
    ["pending", "funded", "delivered", "disputed"].includes(e.status)
  );
  const completedEscrows = escrows.filter((e) =>
    ["released", "refunded"].includes(e.status)
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Mis Escrows</h1>
          </div>
          <Button asChild size="sm" className="gap-2">
            <Link href="/create">
              <Plus className="h-4 w-4" />
              Nuevo escrow
            </Link>
          </Button>
        </div>

        {/* Connect wallet */}
        {!wallet && (
          <Card>
            <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
              <p className="text-muted-foreground text-sm">
                Conecta tu billetera para ver tus escrows como vendedor.
              </p>
              <Button onClick={connect} disabled={isConnecting} className="gap-2">
                {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isConnecting ? "Conectando..." : "Conectar Freighter"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {wallet && isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error */}
        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {/* Active escrows */}
        {wallet && !isLoading && (
          <>
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Activos ({activeEscrows.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadEscrows}
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  Actualizar
                </Button>
              </div>

              {activeEscrows.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                    No tienes escrows activos.{" "}
                    <Link
                      href="/create"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      Crear uno nuevo
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeEscrows.map((escrow) => (
                    <EscrowRow
                      key={escrow.id}
                      escrow={escrow}
                      walletPublicKey={wallet.publicKey}
                      onReleaseSuccess={handleReleaseSuccess}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Completed escrows */}
            {completedEscrows.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Completados ({completedEscrows.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {completedEscrows.map((escrow) => (
                    <EscrowRow
                      key={escrow.id}
                      escrow={escrow}
                      walletPublicKey={wallet.publicKey}
                      onReleaseSuccess={handleReleaseSuccess}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Stats bar */}
        {wallet && !isLoading && escrows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {escrows.length}
                </p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activeEscrows.length}
                </p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">
                  {escrows.filter((e) => e.status === "released").length}
                </p>
                <p className="text-xs text-muted-foreground">Completados</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
