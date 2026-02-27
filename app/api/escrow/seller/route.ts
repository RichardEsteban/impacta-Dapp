/**
 * GET /api/escrow/seller?address=G...
 *
 * Returns all escrows for a given seller address, ordered by creation date desc.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "address es requerido" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("escrows")
      .select(
        "id, seller_address, buyer_address, escrow_public_key, amount_xlm, description, status, deadline_days, created_at, funded_at, payment_link, fund_tx_hash, release_tx_hash, refund_tx_hash"
      )
      .eq("seller_address", address)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Error al obtener los escrows" },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("GET /api/escrow/seller error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
