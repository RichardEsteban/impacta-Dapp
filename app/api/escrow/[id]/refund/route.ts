/**
 * POST /api/escrow/[id]/refund
 *
 * Refunds funds from escrow → buyer.
 * Can be called in two scenarios:
 *   1. Buyer requests refund (dispute) — passes signedXDR signed by buyer
 *   2. Arbiter forces refund (dispute resolution) — no signedXDR, arbiter signs alone
 *      (only works if arbiter has threshold weight alone — for MVP, arbiter must still
 *       provide 2 signatures, so we sign with arbiter keypair twice as a workaround,
 *       or add a dispute flag that elevates arbiter to weight 2)
 *
 * For the MVP we use the simple path:
 *   - Buyer passes their signed XDR → arbiter co-signs (2-of-3 satisfied)
 *   - Arbiter-only path: not implemented in MVP (requires on-chain config change)
 *
 * Body: { signedXDR: string }
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
          error: `No se puede reembolsar un escrow en estado: ${escrow.status}`,
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
      .update({ status: "refunded", refund_tx_hash: txHash })
      .eq("id", id)
      .select(
        "id, seller_address, buyer_address, escrow_public_key, amount_xlm, description, status, deadline_days, created_at, funded_at, payment_link, fund_tx_hash, release_tx_hash, refund_tx_hash"
      )
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Reembolso enviado pero error al actualizar estado" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ...updated, txHash });
  } catch (err) {
    console.error("POST /api/escrow/[id]/refund error:", err);
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
