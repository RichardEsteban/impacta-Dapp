/**
 * POST /api/escrow/[id]/fund
 *
 * Called after the buyer has deposited XLM into the escrow account.
 *
 * Body: { buyerAddress: string, txHash?: string }
 *
 * 1. Loads the escrow from Supabase
 * 2. Verifies on-chain that the payment was received (or accepts txHash)
 * 3. Adds the buyer as a signer to the escrow multisig
 * 4. Updates the escrow status to "funded"
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyPayment } from "@/lib/stellar/escrow";
import { getArbiterPublicKey, getArbiterSecretKey } from "@/lib/stellar/arbiter";
import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
} from "@stellar/stellar-sdk";

const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { buyerAddress, txHash } = body;

    if (!buyerAddress || typeof buyerAddress !== "string") {
      return NextResponse.json(
        { error: "buyerAddress es requerido" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Load escrow
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

    if (escrow.status !== "pending") {
      return NextResponse.json(
        { error: `El escrow ya está en estado: ${escrow.status}` },
        { status: 409 }
      );
    }

    // 2. Verify payment on-chain
    let verifiedTxHash = txHash;
    if (!verifiedTxHash) {
      verifiedTxHash = await verifyPayment(
        escrow.escrow_public_key,
        buyerAddress,
        escrow.amount_xlm
      );
      if (!verifiedTxHash) {
        return NextResponse.json(
          {
            error: `No se encontró el pago de ${escrow.amount_xlm} XLM desde ${buyerAddress} al escrow`,
          },
          { status: 402 }
        );
      }
    }

    // 3. Add buyer as a signer (replace the placeholder signer set at creation)
    //    We also ensure seller and arbiter remain as signers.
    //    SetOptions allows adding new signers; removing old ones requires specifying weight=0.
    const server = new Horizon.Server(HORIZON_URL);
    const escrowKeypair = Keypair.fromSecret(escrow.escrow_secret_key);
    const arbiterKeypair = Keypair.fromSecret(getArbiterSecretKey());
    const arbiterPublicKey = getArbiterPublicKey();

    const escrowAccount = await server.loadAccount(escrow.escrow_public_key);

    // Check existing signers to avoid duplicates or conflicts
    const existingSigners: string[] = escrowAccount.signers.map(
      (s: any) => s.key
    );
    const needsSellerSigner = !existingSigners.includes(escrow.seller_address);
    const needsBuyerSigner = !existingSigners.includes(buyerAddress);
    const needsArbiterSigner = !existingSigners.includes(arbiterPublicKey);

    // Build SetOptions operations only for missing signers
    // Note: at creation, seller was added as a real signer (not placeholder
    // since we used sellerAddress twice).  Buyer may not yet be a signer.
    const ops: ReturnType<typeof Operation.setOptions>[] = [];
    if (needsSellerSigner) {
      ops.push(
        Operation.setOptions({ signer: { ed25519PublicKey: escrow.seller_address, weight: 1 } })
      );
    }
    if (needsBuyerSigner) {
      ops.push(
        Operation.setOptions({ signer: { ed25519PublicKey: buyerAddress, weight: 1 } })
      );
    }
    if (needsArbiterSigner) {
      ops.push(
        Operation.setOptions({ signer: { ed25519PublicKey: arbiterPublicKey, weight: 1 } })
      );
    }

    if (ops.length > 0) {
      const txBuilder = new TransactionBuilder(escrowAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      });
      for (const op of ops) {
        txBuilder.addOperation(op);
      }
      const signerTx = txBuilder.setTimeout(30).build();
      // Current signers can co-sign (seller + arbiter satisfy threshold=2 at this point)
      signerTx.sign(escrowKeypair);
      signerTx.sign(arbiterKeypair);
      await server.submitTransaction(signerTx as any);
    }

    // 4. Update Supabase
    const { data: updated, error: updateError } = await supabase
      .from("escrows")
      .update({
        buyer_address: buyerAddress,
        status: "funded",
        funded_at: new Date().toISOString(),
        fund_tx_hash: verifiedTxHash,
      })
      .eq("id", id)
      .select(
        "id, seller_address, buyer_address, escrow_public_key, amount_xlm, description, status, deadline_days, created_at, funded_at, payment_link, fund_tx_hash, release_tx_hash, refund_tx_hash"
      )
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar el escrow" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST /api/escrow/[id]/fund error:", err);
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
