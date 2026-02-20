/**
 * Stellar XLM payment utilities.
 *
 * This module centralises every blockchain interaction so the rest of the app
 * stays framework-agnostic.  It is designed for the **Stellar Testnet** and
 * uses the Freighter browser-extension wallet for signing.
 *
 * NOTE: Heavy dependencies (`@stellar/stellar-sdk`, `@stellar/freighter-api`)
 * are imported dynamically so the module can be loaded safely on the server
 * during SSR -- the actual calls only ever run in the browser.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionResult {
  status: "success" | "error";
  hash?: string;
  error?: string;
  timestamp?: string;
}

export interface WalletInfo {
  publicKey: string;
  network: string;
}

// ---------------------------------------------------------------------------
// Helpers -- lazy-loaded Stellar SDK wrappers
// ---------------------------------------------------------------------------

/**
 * Check whether the Freighter extension is available in the current browser.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    await import("@stellar/freighter-api");
    return true;
  } catch {
    return false;
  }
}

/**
 * Request the user's public key from Freighter and ensure the wallet is on the
 * Stellar Testnet.
 */
export async function connectWallet(): Promise<WalletInfo> {
  if (typeof window === "undefined") {
    throw new Error("Wallet connection is only available in the browser.");
  }

  let freighter: typeof import("@stellar/freighter-api");

  try {
    freighter = await import("@stellar/freighter-api");
  } catch {
    throw new Error(
      "Freighter wallet not detected. Please install the Freighter browser extension."
    );
  }

  try {
    // 1️⃣ Solicita acceso (esto abre popup si no está autorizado)
    await freighter.requestAccess();

    // 2️⃣ Luego obtiene la public key correctamente
    const publicKey = await freighter.getPublicKey();

    if (!publicKey) {
      throw new Error("Unable to retrieve public key from Freighter.");
    }

    return {
      publicKey,
      network: "TESTNET",
    };
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? err.message
        : "Freighter is installed but not responding. Make sure it is unlocked."
    );
  }
}

/**
 * Fund a testnet account via Friendbot.
 */
export async function fundAccountWithFriendbot(
  publicKey: string
): Promise<boolean> {
  try {
    const res = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch the native XLM balance of an account from Horizon.
 */
export async function getAccountBalance(
  publicKey: string
): Promise<string | null> {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    if (!res.ok) return null;
    const data = await res.json();
    const native = data.balances?.find(
      (b: { asset_type: string }) => b.asset_type === "native"
    );
    return native?.balance ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// XLM Payment via Horizon
// ---------------------------------------------------------------------------

/**
 * Build, sign (via Freighter) and submit a native XLM payment transaction
 * on the Stellar Testnet using the Horizon server.
 */
export async function sendXLM(
  destination: string,
  amount: string,
  publicKey: string
): Promise<TransactionResult> {
  // Input validation
  if (!destination || destination.length !== 56 || !destination.startsWith("G")) {
    return {
      status: "error",
      error:
        "Invalid destination address. Must be a 56-character Stellar public key starting with G.",
    };
  }

  const numericAmount = parseFloat(amount);
  if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
    return {
      status: "error",
      error: "Amount must be a positive number.",
    };
  }

  if (!publicKey) {
    return {
      status: "error",
      error: "Wallet not connected.",
    };
  }

  if (destination === publicKey) {
    return {
      status: "error",
      error: "Cannot send XLM to yourself.",
    };
  }

  try {
    // Dynamic imports -- keeps bundle size small
    const StellarSdk = await import("@stellar/stellar-sdk");
    const freighter = await import("@stellar/freighter-api");

    const server = new StellarSdk.Horizon.Server(HORIZON_URL);

    // Load source account from Horizon
    const sourceAccount = await server.loadAccount(publicKey);

    // Fetch current base fee
    const baseFee = await server.fetchBaseFee();

    // Build the payment transaction
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: String(baseFee),
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination,
          asset: StellarSdk.Asset.native(),
          amount: numericAmount.toFixed(7),
        })
      )
      .setTimeout(30)
      .build();

    // Sign via Freighter
    const signResult = await freighter.signTransaction(tx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    if (signResult.error) {
      return {
        status: "error",
        error: signResult.error ?? "Transaction signing was rejected.",
      };
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signResult.signedTxXdr,
      NETWORK_PASSPHRASE
    );

    // Submit via Horizon
    const response = await server.submitTransaction(
      signedTx as StellarSdk.Transaction
    );

    return {
      status: "success",
      hash: response.hash,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Horizon returns detailed error info in `response.data.extras`
    if (
      err &&
      typeof err === "object" &&
      "response" in err &&
      (err as { response?: { data?: { extras?: { result_codes?: unknown } } } })
        .response?.data?.extras?.result_codes
    ) {
      const codes = (
        err as {
          response: { data: { extras: { result_codes: Record<string, unknown> } } };
        }
      ).response.data.extras.result_codes;
      return {
        status: "error",
        error: `Transaction failed: ${JSON.stringify(codes)}`,
      };
    }

    const message =
      err instanceof Error ? err.message : "An unknown error occurred.";
    return {
      status: "error",
      error: message,
    };
  }
}

// ---------------------------------------------------------------------------
// Utility -- shorten a Stellar address for display
// ---------------------------------------------------------------------------

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
