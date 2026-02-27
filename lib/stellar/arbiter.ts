/**
 * Arbiter keypair utilities — SERVER SIDE ONLY
 *
 * The arbiter is a backend-controlled Stellar keypair that co-signs
 * release and refund transactions.  Its secret key is stored in the
 * ARBITER_SECRET_KEY environment variable and must NEVER be exposed
 * to the client.
 */

import { Keypair } from "@stellar/stellar-sdk";

// ---------------------------------------------------------------------------
// Load arbiter keypair (server-side)
// ---------------------------------------------------------------------------

let _arbiterKeypair: Keypair | null = null;

export function getArbiterKeypair(): Keypair {
  if (_arbiterKeypair) return _arbiterKeypair;

  const secret = process.env.ARBITER_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "ARBITER_SECRET_KEY is not set. Add it to .env.local before running."
    );
  }

  try {
    _arbiterKeypair = Keypair.fromSecret(secret);
  } catch {
    throw new Error(
      "ARBITER_SECRET_KEY is invalid. Expected a Stellar secret key starting with S."
    );
  }

  return _arbiterKeypair;
}

export function getArbiterPublicKey(): string {
  return getArbiterKeypair().publicKey();
}

export function getArbiterSecretKey(): string {
  return getArbiterKeypair().secret();
}
