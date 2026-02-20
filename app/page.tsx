import { AppHeader } from "@/components/app-header";
import { SendPayment } from "@/components/send-payment";
import { InfoPanel } from "@/components/info-panel";
import { WalletAlert } from "@/components/wallet-alert";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:flex-row lg:gap-8 lg:px-8">
        {/* Primary -- send XLM payment */}
        <div className="flex flex-1 flex-col gap-6">
          <WalletAlert />
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
