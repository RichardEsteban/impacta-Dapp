import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { SendPayment } from "@/components/send-payment";
import { InfoPanel } from "@/components/info-panel";
import { WalletAlert } from "@/components/wallet-alert";
import {
  LayoutDashboard,
  Plus,
  ShieldCheck,
  Zap,
  Users,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:py-8 lg:px-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 sm:p-8">
          {/* Background gradient decoration */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full gradient-primary opacity-10 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-primary/20 opacity-20 blur-2xl" />

          <div className="relative">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <span className="text-xs font-semibold text-primary">Stellar Testnet</span>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
              Pagos Seguros para{" "}
              <span className="gradient-text">Microempresarios</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground leading-relaxed">
              Protege tus transacciones con escrow descentralizado en Stellar.
              Sin intermediarios, sin bancos, sin riesgo de estafa.
            </p>

            {/* Feature pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: ShieldCheck, label: "Escrow 2-de-3" },
                { icon: Zap, label: "Instantáneo" },
                { icon: Users, label: "Peer-to-Peer" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  <Icon className="h-3 w-3 text-primary" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wallet Alert */}
        <WalletAlert />

        {/* Escrow Quick Actions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/create"
            className="group relative overflow-hidden flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5 card-hover"
          >
            <div className="absolute inset-0 gradient-primary opacity-0 group-hover:opacity-5 transition-opacity" />
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gradient-primary shadow-lg">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-foreground">Crear Escrow</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Vende de forma segura — el comprador paga primero
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="group relative overflow-hidden flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5 card-hover"
          >
            <div className="absolute inset-0 gradient-primary opacity-0 group-hover:opacity-5 transition-opacity" />
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary shadow-md border border-border/50">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-foreground">Mis Escrows</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Gestiona tus acuerdos de pago activos
              </p>
            </div>
          </Link>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Primary -- send XLM payment */}
          <div className="flex flex-1 flex-col gap-6">
            <SendPayment />
          </div>

          {/* Sidebar – wallet & network info */}
          <aside className="w-full shrink-0 lg:w-80">
            <InfoPanel />
          </aside>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg gradient-primary">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold gradient-text">Impacta</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Escrow Seguro · Stellar Testnet · Solo para pruebas
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
