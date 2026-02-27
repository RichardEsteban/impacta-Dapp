/**
 * SME Escrow — Stellar SDK logic
 *
 * All escrow-related on-chain operations live here.
 * This module runs on the SERVER (API routes) and in the BROWSER (for
 * Freighter signing).  Server-side calls use the Stellar SDK directly;
 * browser-side signing is done via Freighter.
 *
 * All operations target STELLAR TESTNET.
 */

import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  BASE_FEE,
} from "@stellar/stellar-sdk";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";

// Minimum XLM required to keep the escrow account alive:
// 1 base reserve (0.5 XLM) × 2 (base) + 3 signers × 0.5 = 2 XLM
// We fund with 2.5 XLM to cover fees safely.
export const ESCROW_RESERVE_XLM = "2.5";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EscrowKeypairResult {
  escrowPublicKey: string;
  escrowSecretKey: string;
}

export interface CreateEscrowResult extends EscrowKeypairResult {
  /** XDR of the signed CreateAccount + initial SetOptions tx (arbiter-signed) */
  createAccountXDR: string;
}

// ---------------------------------------------------------------------------
// Horizon server (server-side only)
// ---------------------------------------------------------------------------

export function getServer(): Horizon.Server {
  return new Horizon.Server(HORIZON_URL);
}

// ---------------------------------------------------------------------------
// Fund a testnet account via Friendbot
// ---------------------------------------------------------------------------

export async function friendbotFund(publicKey: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Friendbot failed for ${publicKey}: ${text}`);
  }
}

// ---------------------------------------------------------------------------
// 1. createEscrowAccount
//    - Generates a fresh Stellar keypair for the escrow account
//    - Funds it from Friendbot (testnet)
//    - Funds the arbiter account if needed
//    Returns the keypair info; the caller (API route) persists it.
// ---------------------------------------------------------------------------

export async function createEscrowAccount(
  _sellerPublicKey: string,
  _amountXLM: number
): Promise<EscrowKeypairResult> {
  const escrowKeypair = Keypair.random();

  // Fund the fresh escrow account via Friendbot (testnet only)
  await friendbotFund(escrowKeypair.publicKey());

  return {
    escrowPublicKey: escrowKeypair.publicKey(),
    escrowSecretKey: escrowKeypair.secret(),
  };
}

// ---------------------------------------------------------------------------
// 2. setMultisigSigners
//    - Configures the escrow account for 2-of-3 multisig:
//      seller(1) + buyer(1) + arbiter(1), master weight 0, all thresholds 2
//    - Signs with the escrow keypair AND the arbiter keypair
//    - Returns a signed transaction XDR ready to submit
// ---------------------------------------------------------------------------

export async function setMultisigSigners(
  escrowSecretKey: string,
  sellerPublicKey: string,
  buyerPublicKey: string,
  arbiterPublicKey: string,
  arbiterSecretKey: string
): Promise<string> {
  const server = getServer();
  const escrowKeypair = Keypair.fromSecret(escrowSecretKey);
  const arbiterKeypair = Keypair.fromSecret(arbiterSecretKey);

  const escrowAccount = await server.loadAccount(escrowKeypair.publicKey());

  const tx = new TransactionBuilder(escrowAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.setOptions({
        masterWeight: 0,       // escrow account itself cannot sign alone
        lowThreshold: 2,
        medThreshold: 2,
        highThreshold: 2,
        signer: { ed25519PublicKey: sellerPublicKey, weight: 1 },
      })
    )
    .addOperation(
      Operation.setOptions({
        signer: { ed25519PublicKey: buyerPublicKey, weight: 1 },
      })
    )
    .addOperation(
      Operation.setOptions({
        signer: { ed25519PublicKey: arbiterPublicKey, weight: 1 },
      })
    )
    .setTimeout(30)
    .build();

  // Requires escrow + arbiter signatures (2-of-3 satisfies the old threshold
  // before it is changed to 2, since master weight is still 1 at this point)
  tx.sign(escrowKeypair);
  tx.sign(arbiterKeypair);

  const result = await server.submitTransaction(tx);
  if (!result.successful) {
    throw new Error(`setMultisigSigners failed: ${JSON.stringify(result)}`);
  }

  return result.hash;
}

// ---------------------------------------------------------------------------
// 3. buildReleaseTransaction
//    - Builds an unsigned tx that sends `amountXLM` from escrow → seller
//    - Returns the XDR for the buyer + arbiter (or seller + arbiter) to sign
// ---------------------------------------------------------------------------

export async function buildReleaseTransaction(
  escrowPublicKey: string,
  sellerPublicKey: string,
  amountXLM: number
): Promise<string> {
  const server = getServer();
  const escrowAccount = await server.loadAccount(escrowPublicKey);

  const tx = new TransactionBuilder(escrowAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: sellerPublicKey,
        asset: Asset.native(),
        amount: amountXLM.toFixed(7),
      })
    )
    .setTimeout(300)
    .build();

  return tx.toXDR();
}

// ---------------------------------------------------------------------------
// 4. buildRefundTransaction
//    - Builds an unsigned tx that sends `amountXLM` from escrow → buyer
//    - Returns the XDR for the seller + arbiter (or arbiter alone) to sign
// ---------------------------------------------------------------------------

export async function buildRefundTransaction(
  escrowPublicKey: string,
  buyerPublicKey: string,
  amountXLM: number
): Promise<string> {
  const server = getServer();
  const escrowAccount = await server.loadAccount(escrowPublicKey);

  const tx = new TransactionBuilder(escrowAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: buyerPublicKey,
        asset: Asset.native(),
        amount: amountXLM.toFixed(7),
      })
    )
    .setTimeout(300)
    .build();

  return tx.toXDR();
}

// ---------------------------------------------------------------------------
// 5. signAndSubmitWithArbiter
//    - Takes an XDR already signed by one party (buyer or seller via Freighter)
//    - Adds the arbiter signature and submits to Horizon
//    - Returns the transaction hash
// ---------------------------------------------------------------------------

export async function signAndSubmitWithArbiter(
  signedXDR: string,
  arbiterSecretKey: string
): Promise<string> {
  const {
    TransactionBuilder: TB,
  } = await import("@stellar/stellar-sdk");

  const server = getServer();
  const arbiterKeypair = Keypair.fromSecret(arbiterSecretKey);

  const tx = TB.fromXDR(signedXDR, NETWORK_PASSPHRASE);
  tx.sign(arbiterKeypair);

  const result = await server.submitTransaction(tx as any);
  if (!result.successful) {
    throw new Error(
      `Transaction failed: ${JSON.stringify(
        (result as any).extras?.result_codes
      )}`
    );
  }
  return result.hash;
}

// ---------------------------------------------------------------------------
// 6. verifyPayment
//    - Checks Horizon for an incoming payment from buyerPublicKey to
//      escrowPublicKey of at least amountXLM
//    - Returns the transaction hash if found, null otherwise
// ---------------------------------------------------------------------------

export async function verifyPayment(
  escrowPublicKey: string,
  buyerPublicKey: string,
  amountXLM: number
): Promise<string | null> {
  try {
    const server = getServer();
    const payments = await server
      .payments()
      .forAccount(escrowPublicKey)
      .order("desc")
      .limit(20)
      .call();

    for (const record of payments.records) {
      if (
        record.type === "payment" &&
        (record as any).asset_type === "native" &&
        (record as any).from === buyerPublicKey
      ) {
        const paid = parseFloat((record as any).amount);
        if (paid >= amountXLM) {
          return (record as any).transaction_hash;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 7. getEscrowBalance
//    - Returns the native XLM balance of the escrow account
// ---------------------------------------------------------------------------

export async function getEscrowBalance(
  escrowPublicKey: string
): Promise<string | null> {
  try {
    const server = getServer();
    const account = await server.loadAccount(escrowPublicKey);
    const native = account.balances.find(
      (b: any) => b.asset_type === "native"
    );
    return native?.balance ?? null;
  } catch {
    return null;
  }
}
