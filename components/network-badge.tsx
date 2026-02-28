"use client";

export function NetworkBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <span className="text-xs font-semibold text-primary">
        Testnet
      </span>
    </div>
  );
}
