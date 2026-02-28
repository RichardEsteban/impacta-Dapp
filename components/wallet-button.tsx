"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, LogOut, Copy, Loader2, ChevronDown } from "lucide-react";
import { useState } from "react";

interface WalletButtonProps {
  connected: boolean;
  displayAddress: string;
  balance: string | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletButton({
  connected,
  displayAddress,
  balance,
  isConnecting,
  onConnect,
  onDisconnect,
}: WalletButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!connected) {
    return (
      <Button
        onClick={onConnect}
        disabled={isConnecting}
        size="sm"
        className="gap-2 gradient-primary border-0 text-white font-semibold shadow-lg hover:opacity-90 transition-opacity"
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {isConnecting ? "Conectando..." : "Conectar Wallet"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary/30 bg-primary/10 hover:bg-primary/20 hover:border-primary/50 transition-all"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="font-mono text-xs text-primary font-semibold">{displayAddress}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 border-border/50 bg-card/95 backdrop-blur-xl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-2 py-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Conectado</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {displayAddress}
                </p>
              </div>
            </div>
            {balance && (
              <div className="rounded-lg bg-secondary/80 px-3 py-2">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-base font-bold text-foreground">
                  {parseFloat(balance).toFixed(2)}{" "}
                  <span className="text-sm font-normal text-primary">XLM</span>
                </p>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer gap-2 focus:bg-primary/10">
          <Copy className="h-4 w-4 text-muted-foreground" />
          {copied ? "¡Copiado!" : "Copiar Dirección"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDisconnect}
          className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Desconectar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
