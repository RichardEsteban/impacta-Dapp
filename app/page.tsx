import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { SendPayment } from "@/components/send-payment";
import { InfoPanel } from "@/components/info-panel";
import { WalletAlert } from "@/components/wallet-alert";
import { LayoutDashboard, Plus } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:flex-row lg:gap-8 lg:px-8">
        {/* Primary -- send XLM payment */}
        <div className="flex flex-1 flex-col gap-6">
          <WalletAlert />

          {/* Escrow quick links */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/create"
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Crear Escrow</p>
                <p className="text-xs text-muted-foreground">
                  Vende de forma segura — el comprador paga primero
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Mis Escrows</p>
                <p className="text-xs text-muted-foreground">
                  Gestiona tus acuerdos de pago activos
                </p>
              </div>
            </Link>
          </div>

          <SendPayment />
        </div>

        {/* Sidebar – wallet & network info */}
        <aside className="w-full shrink-0 lg:w-80">
          <InfoPanel />
        </aside>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>
          Impacta &mdash; Stellar XLM Payments &mdash; Testnet Only
        </p>
      </footer>
    </div>
  );
}
