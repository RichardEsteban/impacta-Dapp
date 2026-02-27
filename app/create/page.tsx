"use client";

/**
 * /create — Seller creates an escrow
 *
 * Form fields:
 *   - Descripción del producto
 *   - Monto en XLM
 *   - Plazo (días)
 *
 * On submit:
 *   1. Calls POST /api/escrow/create
 *   2. Shows the Payment Link with copy + QR code
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/context/wallet-context";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Share2,
  LayoutDashboard,
} from "lucide-react";
import type { Escrow } from "@/lib/supabase";
import dynamic from "next/dynamic";

// QR code is client-only
const QRCode = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeSVG),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Status label helpers (Spanish)
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente de pago",
  funded: "Fondos recibidos",
  delivered: "Entregado",
  released: "Fondos liberados",
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateEscrowPage() {
  const { wallet, connect, isConnecting } = useWallet();
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [amountXlm, setAmountXlm] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("7");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Escrow | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet?.publicKey) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/escrow/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: wallet.publicKey,
          amountXlm: parseFloat(amountXlm),
          description,
          deadlineDays: parseInt(deadlineDays, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Error al crear el escrow");
      }

      setCreated(data as Escrow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ---------------------------------------------------------------------------
  // Render: success state
  // ---------------------------------------------------------------------------

  if (created) {
    const payLink = created.payment_link ?? `${window.location.origin}/pay/${created.id}`;
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
          <Card className="border-green-500/30">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle className="text-xl">¡Escrow creado!</CardTitle>
              <CardDescription>
                Comparte el enlace de pago con tu comprador.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
              {/* Summary */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Producto</span>
                  <span className="font-medium text-right max-w-[60%] truncate">
                    {created.description}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto</span>
                  <span className="font-mono font-semibold text-primary">
                    {Number(created.amount_xlm).toFixed(2)} XLM
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plazo</span>
                  <span>{created.deadline_days} días</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant={STATUS_VARIANTS[created.status]}>
                    {STATUS_LABELS[created.status]}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Payment link */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Enlace de pago para el comprador
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={payLink}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(payLink)}
                    className="shrink-0"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  O escanea el código QR:
                </p>
                <div className="rounded-xl border border-border bg-white p-4">
                  <QRCode value={payLink} size={180} />
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => handleCopy(payLink)}
                >
                  <Share2 className="h-4 w-4" />
                  Copiar enlace
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  asChild
                >
                  <Link href={`/pay/${created.id}`} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                    Ver página de pago
                  </Link>
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => router.push("/dashboard")}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Mis escrows
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: form
  // ---------------------------------------------------------------------------

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
        {/* Intro */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Nuevo Escrow</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Crea un acuerdo de pago seguro. El comprador depositará XLM y los
            fondos se liberarán cuando confirme la entrega.
          </p>
        </div>

        {/* Connect wallet notice */}
        {!wallet && (
          <Alert>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>Conecta tu billetera para continuar.</span>
              <Button size="sm" onClick={connect} disabled={isConnecting}>
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isConnecting ? "Conectando..." : "Conectar"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalles del acuerdo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">Descripción del producto</Label>
                <Textarea
                  id="description"
                  placeholder="Ej: Zapatillas Nike Air Force 1 talla 42, color blanco..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  required
                  minLength={3}
                  maxLength={300}
                  disabled={!wallet || isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/300 caracteres
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="amount">Monto a recibir (XLM)</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="100"
                    min="1"
                    step="0.01"
                    value={amountXlm}
                    onChange={(e) => setAmountXlm(e.target.value)}
                    required
                    disabled={!wallet || isSubmitting}
                    className="pr-14"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    XLM
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  El comprador depositará exactamente esta cantidad.
                </p>
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <Label htmlFor="deadline">Plazo de entrega (días)</Label>
                <Input
                  id="deadline"
                  type="number"
                  placeholder="7"
                  min="1"
                  max="90"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                  required
                  disabled={!wallet || isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Si el comprador no confirma la entrega en este plazo, puedes
                  solicitar la liberación de fondos.
                </p>
              </div>

              {/* Seller address preview */}
              {wallet && (
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Vendedor: </span>
                  <span className="font-mono break-all">{wallet.publicKey}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={!wallet || isSubmitting}
                className="w-full gap-2"
                size="lg"
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Creando escrow..." : "Crear Escrow"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Se creará una cuenta temporal en Stellar Testnet. El proceso
                puede tardar unos segundos.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Back to dashboard link */}
        <div className="text-center text-sm text-muted-foreground">
          <Link href="/dashboard" className="underline underline-offset-4 hover:text-foreground">
            Ver mis escrows existentes
          </Link>
        </div>
      </main>
    </div>
  );
}
