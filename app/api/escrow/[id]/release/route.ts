/**
 * POST /api/escrow/[id]/release
 *
 * Releases funds from escrow → seller.
 * Called after the buyer signs the release transaction via Freighter.
 *
 * Body: { signedXDR: string }  — transaction already signed by the buyer (or seller)
 *
 * The arbiter adds its signature and submits to Horizon.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { signAndSubmitWithArbiter } from "@/lib/stellar/escrow";
import { getArbiterSecretKey } from "@/lib/stellar/arbiter";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { signedXDR } = body;

    if (!signedXDR || typeof signedXDR !== "string") {
      return NextResponse.json(
        { error: "signedXDR es requerido" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Load escrow
    const { data: escrow, error: fetchError } = await supabase
      .from("escrows")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !escrow) {
      return NextResponse.json(
        { error: "Escrow no encontrado" },
        { status: 404 }
      );
    }

    if (!["funded", "delivered", "disputed"].includes(escrow.status)) {
      return NextResponse.json(
        {
          error: `No se puede liberar un escrow en estado: ${escrow.status}`,
        },
        { status: 409 }
      );
    }

    // Arbiter co-signs and submits
    const txHash = await signAndSubmitWithArbiter(
      signedXDR,
      getArbiterSecretKey()
    );

    // Update status
    const { data: updated, error: updateError } = await supabase
      .from("escrows")
      .update({ status: "released", release_tx_hash: txHash })
      .eq("id", id)
      .select(
        "id, seller_address, buyer_address, escrow_public_key, amount_xlm, description, status, deadline_days, created_at, funded_at, payment_link, fund_tx_hash, release_tx_hash, refund_tx_hash"
      )
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Fondos liberados pero error al actualizar estado" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ...updated, txHash });
  } catch (err) {
    console.error("POST /api/escrow/[id]/release error:", err);
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
