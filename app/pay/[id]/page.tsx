"use client";

/**
 * /pay/[id] — Buyer Payment Link page
 *
 * Flow:
 * 1. Load escrow details from GET /api/escrow/[id]
 * 2. Buyer connects Freighter wallet
 * 3. Buyer deposits exact XLM amount to escrow address (sendXLM)
 * 4. App calls POST /api/escrow/[id]/fund to verify and update status
 * 5. Once funded:
 *    - "Confirmar entrega" button → builds release tx, buyer signs via Freighter,
 *      calls POST /api/escrow/[id]/release
 *    - "Solicitar reembolso" button → builds refund tx, buyer signs,
 *      calls POST /api/escrow/[id]/refund
 */

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/context/wallet-context";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ArrowDownToLine,
  AlertTriangle,
  RotateCcw,
  Clock,
} from "lucide-react";
import type { Escrow } from "@/lib/supabase";
import {
  NETWORK_PASSPHRASE,
  buildReleaseTransaction,
  buildRefundTransaction,
} from "@/lib/stellar/escrow";
import { sendXLM } from "@/lib/stellar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  pending: "Esperando pago",
  funded: "Fondos recibidos — en espera de entrega",
  delivered: "Entregado — pendiente confirmación",
  released: "Fondos liberados al vendedor",
  refunded: "Reembolsado al comprador",
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

function deadlineDate(createdAt: string, days: number): string {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PayEscrowPage() {
  const { id } = useParams<{ id: string }>();
  const { wallet, connect, isConnecting } = useWallet();

  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  // Load escrow on mount
  const loadEscrow = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/escrow/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Escrow no encontrado");
      setEscrow(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEscrow();
  }, [loadEscrow]);

  // ---------------------------------------------------------------------------
  // Action: Fund (deposit XLM)
  // ---------------------------------------------------------------------------

  const handleFund = async () => {
    if (!escrow || !wallet?.publicKey) return;
    setIsActing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // 1. Send XLM from buyer to escrow account
      const result = await sendXLM(
        escrow.escrow_public_key,
        String(escrow.amount_xlm),
        wallet.publicKey
      );

      if (result.status === "error") {
        throw new Error(result.error ?? "Error al enviar XLM");
      }

      // 2. Notify backend to verify and update status
      const res = await fetch(`/api/escrow/${id}/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerAddress: wallet.publicKey,
          txHash: result.hash,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al confirmar el pago");

      setEscrow(data);
      setActionSuccess(
        `Pago de ${escrow.amount_xlm} XLM recibido. El vendedor enviará tu pedido pronto.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsActing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Action: Confirm Delivery (buyer signs release tx)
  // ---------------------------------------------------------------------------

  const handleConfirmDelivery = async () => {
    if (!escrow || !wallet?.publicKey) return;
    setIsActing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // 1. Build unsigned release tx
      const xdr = await buildReleaseTransaction(
        escrow.escrow_public_key,
        escrow.seller_address,
        Number(escrow.amount_xlm)
      );

      // 2. Buyer signs via Freighter
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

      // 3. Send to backend (arbiter co-signs and submits)
      const res = await fetch(`/api/escrow/${id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXDR: signResultObj.signedTxXdr }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al liberar fondos");

      setEscrow(data);
      setActionSuccess(
        `Fondos de ${escrow.amount_xlm} XLM liberados al vendedor. ¡Transacción completada!`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsActing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Action: Request Refund (buyer signs refund tx)
  // ---------------------------------------------------------------------------

  const handleRequestRefund = async () => {
    if (!escrow || !wallet?.publicKey) return;
    if (!escrow.buyer_address) return;

    const confirmed = window.confirm(
      "¿Estás seguro de que deseas solicitar un reembolso? Esta acción requerirá la co-firma del árbitro."
    );
    if (!confirmed) return;

    setIsActing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // 1. Build unsigned refund tx
      const xdr = await buildRefundTransaction(
        escrow.escrow_public_key,
        escrow.buyer_address,
        Number(escrow.amount_xlm)
      );

      // 2. Buyer signs via Freighter
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

      // 3. Send to backend
      const res = await fetch(`/api/escrow/${id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXDR: signResultObj.signedTxXdr }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al procesar el reembolso");

      setEscrow(data);
      setActionSuccess(
        `Reembolso de ${escrow.amount_xlm} XLM enviado a tu billetera.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsActing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: error
  // ---------------------------------------------------------------------------

  if (loadError || !escrow) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4">
          <Alert variant="destructive">
            <AlertDescription>
              {loadError ?? "No se encontró el escrow solicitado."}
            </AlertDescription>
          </Alert>
          <Button asChild variant="outline">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </main>
      </div>
    );
  }

  const isBuyer = wallet?.publicKey === escrow.buyer_address;
  const isSeller = wallet?.publicKey === escrow.seller_address;
  const isFinished = ["released", "refunded"].includes(escrow.status);

  // ---------------------------------------------------------------------------
  // Render: main page
  // ---------------------------------------------------------------------------

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Pago Seguro</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Acuerdo de escrow en Stellar Testnet
          </p>
        </div>

        {/* Escrow summary card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base leading-snug">
                {escrow.description}
              </CardTitle>
              <Badge
                variant={STATUS_VARIANTS[escrow.status]}
                className="shrink-0"
              >
                {STATUS_LABELS[escrow.status]}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Amount */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Monto</p>
              <p className="text-3xl font-bold font-mono text-primary">
                {Number(escrow.amount_xlm).toFixed(2)} XLM
              </p>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-0.5">
                <p className="text-muted-foreground text-xs">Vendedor</p>
                <p className="font-mono text-xs break-all">
                  {shortenAddr(escrow.seller_address)}
                </p>
              </div>
              {escrow.buyer_address && (
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">Comprador</p>
                  <p className="font-mono text-xs break-all">
                    {shortenAddr(escrow.buyer_address)}
                  </p>
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-muted-foreground text-xs">Cuenta escrow</p>
                <p className="font-mono text-xs break-all">
                  {shortenAddr(escrow.escrow_public_key)}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-muted-foreground text-xs">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Plazo
                </p>
                <p className="text-xs">
                  {deadlineDate(escrow.created_at, escrow.deadline_days)}
                </p>
              </div>
            </div>

            {/* TX hashes */}
            {escrow.fund_tx_hash && (
              <div className="text-xs text-muted-foreground break-all">
                <span className="font-medium">TX Depósito: </span>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${escrow.fund_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {escrow.fund_tx_hash.slice(0, 20)}...
                </a>
              </div>
            )}
            {escrow.release_tx_hash && (
              <div className="text-xs text-muted-foreground break-all">
                <span className="font-medium">TX Liberación: </span>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${escrow.release_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {escrow.release_tx_hash.slice(0, 20)}...
                </a>
              </div>
            )}
            {escrow.refund_tx_hash && (
              <div className="text-xs text-muted-foreground break-all">
                <span className="font-medium">TX Reembolso: </span>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${escrow.refund_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {escrow.refund_tx_hash.slice(0, 20)}...
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action feedback */}
        {actionSuccess && (
          <Alert className="border-green-500/30 bg-green-500/5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400">
              {actionSuccess}
            </AlertDescription>
          </Alert>
        )}
        {actionError && (
          <Alert variant="destructive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {/* Connect wallet */}
        {!wallet && !isFinished && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Conecta tu billetera Freighter
              </CardTitle>
              <CardDescription>
                Para participar en este escrow necesitas conectar tu billetera.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={connect} disabled={isConnecting} className="w-full gap-2">
                {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isConnecting ? "Conectando..." : "Conectar Freighter"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {wallet && !isFinished && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* BUYER: deposit */}
              {escrow.status === "pending" && !isSeller && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Como comprador, deposita{" "}
                    <span className="font-semibold text-primary">
                      {Number(escrow.amount_xlm).toFixed(2)} XLM
                    </span>{" "}
                    en la cuenta de escrow para confirmar el acuerdo.
                  </p>
                  <Button
                    onClick={handleFund}
                    disabled={isActing}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isActing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowDownToLine className="h-4 w-4" />
                    )}
                    {isActing
                      ? "Procesando pago..."
                      : `Depositar ${Number(escrow.amount_xlm).toFixed(2)} XLM`}
                  </Button>
                </>
              )}

              {/* BUYER: confirm delivery */}
              {escrow.status === "funded" && isBuyer && (
                <>
                  <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription>
                      ¿Recibiste tu pedido? Al confirmar la entrega, los fondos
                      se liberarán al vendedor inmediatamente.
                    </AlertDescription>
                  </Alert>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={handleConfirmDelivery}
                      disabled={isActing}
                      className="flex-1 gap-2"
                    >
                      {isActing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {isActing ? "Procesando..." : "Confirmar entrega"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRequestRefund}
                      disabled={isActing}
                      className="flex-1 gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Solicitar reembolso
                    </Button>
                  </div>
                </>
              )}

              {/* SELLER waiting message */}
              {escrow.status === "pending" && isSeller && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Compartiste este enlace con tu comprador. Espera a que
                    realice el depósito.
                  </AlertDescription>
                </Alert>
              )}

              {escrow.status === "funded" && isSeller && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Los fondos están en escrow. Envía el producto. Los fondos
                    se liberarán cuando el comprador confirme la entrega.
                  </AlertDescription>
                </Alert>
              )}

              {/* Unknown wallet (not buyer, not seller) */}
              {escrow.status === "pending" &&
                !isSeller &&
                wallet.publicKey !== escrow.buyer_address && (
                  <p className="text-xs text-muted-foreground text-center">
                    Tu billetera:{" "}
                    <span className="font-mono">
                      {shortenAddr(wallet.publicKey)}
                    </span>
                  </p>
                )}
            </CardContent>
          </Card>
        )}

        {/* Finished state */}
        {isFinished && (
          <Card className={escrow.status === "released" ? "border-green-500/30" : "border-orange-500/30"}>
            <CardContent className="pt-6 text-center flex flex-col items-center gap-3">
              {escrow.status === "released" ? (
                <>
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <p className="font-semibold">Transacción completada</p>
                  <p className="text-sm text-muted-foreground">
                    Los fondos fueron liberados al vendedor.
                  </p>
                </>
              ) : (
                <>
                  <RotateCcw className="h-10 w-10 text-orange-500" />
                  <p className="font-semibold">Reembolso procesado</p>
                  <p className="text-sm text-muted-foreground">
                    Los fondos fueron devueltos al comprador.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Refresh */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadEscrow}
            className="gap-2 text-muted-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Actualizar estado
          </Button>
        </div>
      </main>
    </div>
  );
}
