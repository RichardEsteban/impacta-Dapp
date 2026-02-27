/**
 * GET /api/escrow/[id]
 *
 * Returns escrow details (without the secret key).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("escrows")
      .select(
        "id, seller_address, buyer_address, escrow_public_key, amount_xlm, description, status, deadline_days, created_at, funded_at, payment_link, fund_tx_hash, release_tx_hash, refund_tx_hash"
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Escrow no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/escrow/[id] error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
