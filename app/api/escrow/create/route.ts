/**
 * POST /api/escrow/create
 *
 * Body: { sellerAddress: string, amountXlm: number, description: string, deadlineDays: number }
 *
 * 1. Validates input
 * 2. Creates a new Stellar keypair for the escrow account (funded via Friendbot)
 * 3. Sets 2-of-3 multisig (seller + arbiter, buyer added later when they connect)
 *    NOTE: buyer is unknown at creation time, so we add only seller + arbiter now
 *    and add the buyer signer in the /fund step.
 * 4. Persists the escrow to Supabase
 * 5. Returns the escrow record including the payment link
 */

import { NextRequest, NextResponse } from "next/server";
import { createEscrowAccount, setMultisigSigners } from "@/lib/stellar/escrow";
import { getArbiterPublicKey, getArbiterSecretKey } from "@/lib/stellar/arbiter";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sellerAddress, amountXlm, description, deadlineDays } = body;

    // Validation
    if (!sellerAddress || typeof sellerAddress !== "string") {
      return NextResponse.json(
        { error: "sellerAddress es requerido" },
        { status: 400 }
      );
    }
    if (!amountXlm || isNaN(Number(amountXlm)) || Number(amountXlm) <= 0) {
      return NextResponse.json(
        { error: "amountXlm debe ser un número positivo" },
        { status: 400 }
      );
    }
    if (!description || typeof description !== "string" || description.trim().length < 3) {
      return NextResponse.json(
        { error: "description es requerido (mínimo 3 caracteres)" },
        { status: 400 }
      );
    }
    const days = Number(deadlineDays) || 7;

    // 1. Create escrow account (funded via Friendbot on testnet)
    const { escrowPublicKey, escrowSecretKey } = await createEscrowAccount(
      sellerAddress,
      Number(amountXlm)
    );

    // 2. Set 2-of-3 multisig — seller + arbiter now; buyer added on /fund
    //    We use a placeholder buyer = seller for now; actual buyer added in /fund
    //    by re-running setOptions. For simplicity in MVP, we set seller + arbiter
    //    as signers (weight 1 each, threshold 2). Buyer is added when they fund.
    const arbiterPublicKey = getArbiterPublicKey();
    const arbiterSecretKey = getArbiterSecretKey();

    await setMultisigSigners(
      escrowSecretKey,
      sellerAddress,
      sellerAddress,   // temporary placeholder — buyer will be set on fund
      arbiterPublicKey,
      arbiterSecretKey
    );

    // 3. Persist to Supabase
    const supabase = getSupabaseAdmin();
    const origin = req.headers.get("origin") ?? req.nextUrl.origin;

    const { data: escrow, error: dbError } = await supabase
      .from("escrows")
      .insert({
        seller_address: sellerAddress,
        buyer_address: null,
        escrow_public_key: escrowPublicKey,
        escrow_secret_key: escrowSecretKey,  // plaintext for MVP testnet
        amount_xlm: Number(amountXlm),
        description: description.trim(),
        status: "pending",
        deadline_days: days,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json(
        { error: "Error al guardar el escrow en la base de datos" },
        { status: 500 }
      );
    }

    // 4. Update payment_link now that we have the id
    const paymentLink = `${origin}/pay/${escrow.id}`;
    await supabase
      .from("escrows")
      .update({ payment_link: paymentLink })
      .eq("id", escrow.id);

    return NextResponse.json(
      { ...escrow, payment_link: paymentLink },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/escrow/create error:", err);
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
