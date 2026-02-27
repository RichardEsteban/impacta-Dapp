/**
 * Supabase client helpers
 *
 * - `supabaseClient`  — public/anon client, safe for browser use
 * - `supabaseAdmin`   — service-role client, NEVER expose to the browser;
 *                       use only inside API routes / server components
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EscrowStatus =
  | "pending"
  | "funded"
  | "delivered"
  | "released"
  | "refunded"
  | "disputed";

export interface Escrow {
  id: string;
  seller_address: string;
  buyer_address: string | null;
  escrow_public_key: string;
  escrow_secret_key: string;   // only returned by admin client
  amount_xlm: number;
  description: string;
  status: EscrowStatus;
  deadline_days: number;
  created_at: string;
  funded_at: string | null;
  payment_link: string | null;
  fund_tx_hash: string | null;
  release_tx_hash: string | null;
  refund_tx_hash: string | null;
}

// ---------------------------------------------------------------------------
// Browser client (anon key)
// ---------------------------------------------------------------------------

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
  return createClient(url, anonKey);
}

// Keep a lazy singleton for browser use
let _supabaseClient: ReturnType<typeof createClient> | null = null;
export function getSupabaseBrowserClient() {
  if (!_supabaseClient) {
    _supabaseClient = getSupabaseClient();
  }
  return _supabaseClient;
}

// ---------------------------------------------------------------------------
// Admin client (service role — API routes only)
// ---------------------------------------------------------------------------

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for API routes."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
