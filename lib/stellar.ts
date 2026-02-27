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
 * Detect whether the Freighter browser extension is installed.
 *
 * Freighter injects a global `window.freighterApi` object into the page.
 * We check for its presence rather than calling `isConnected()`, which only
 * reports whether the *user has already authorised this site* -- not whether
 * the extension itself is present.
 */
export function isFreighterInstalled(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check multiple possible ways Freighter injects itself
  const freighter = (window as any).freighterApi;
  const stellar = (window as any).stellar;
  const freighterAlt = (window as any).freighter;
  
  console.log("Checking for Freighter:", {
    freighterApi: !!freighter,
    stellar: !!stellar,
    freighter: !!freighterAlt,
    windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('freight') || k.toLowerCase().includes('stellar'))
  });
  
  // Return true if any method is available
  return !!(freighter || stellar || freighterAlt);
}

/** Augment Window so TypeScript knows about the injected global. */
interface WindowWithFreighter extends Window {
  freighterApi?: Record<string, unknown>;
}

/**
 * Request the user's public key from Freighter.
 *
 * This function does **not** pre-gate on `isConnected()`.  Instead it calls
 * `requestAccess()` directly -- Freighter will prompt the user to authorise
 * the site if needed.  If the extension is missing entirely, the dynamic
 * import will succeed but `requestAccess()` will throw or return an error,
 * which we surface as a clear message.
 */
export async function connectWallet(): Promise<WalletInfo> {
  if (typeof window === "undefined") {
    throw new Error("Wallet connection is only available in the browser.");
  }

  // Development bypass - remove this in production
  if (process.env.NODE_ENV === 'development') {
    const urlParams = new URLSearchParams(window.location.search);
    const bypassKey = urlParams.get('bypass');
    if (bypassKey && bypassKey.startsWith('G') && bypassKey.length === 56) {
      console.log("🔧 Development bypass detected");
      return {
        publicKey: bypassKey,
        network: "TESTNET",
      };
    }
  }

  // Quick check: is the extension even present?
  if (!isFreighterInstalled()) {
    throw new Error(
      "Freighter wallet not detected. Please install the Freighter browser extension from https://freighter.app\n\n" +
      "Development tip: Add ?bypass=G_YOUR_TESTNET_KEY to the URL to skip wallet detection"
    );
  }

  let freighter: typeof import("@stellar/freighter-api");
  try {
    freighter = await import("@stellar/freighter-api");
  } catch {
    throw new Error(
      "Failed to load the Freighter API. Please refresh the page and try again."
    );
  }

  // Try multiple methods to get the public key
  let addressResult: { address: string; error: string };
  try {
    // Method 1: Standard Freighter API
    const result = await freighter.requestAccess();
    addressResult = typeof result === 'string' 
      ? { address: result, error: '' }
      : result;
  } catch (err) {
    console.log("Standard method failed, trying alternative...");
    
    // Method 2: Try direct window.stellar if available
    try {
      const stellar = (window as any).stellar;
      if (stellar && stellar.getPublicKey) {
        const key = await stellar.getPublicKey();
        addressResult = { address: key, error: '' };
      } else {
        throw err;
      }
    } catch (altErr) {
      throw new Error(
        `Freighter did not respond. Make sure the extension is unlocked and try again. Error: ${err instanceof Error ? err.message : 'Unknown'}`
      );
    }
  }

  if (addressResult.error) {
    throw new Error(
      addressResult.error ?? "Failed to retrieve your public key from Freighter."
    );
  }

  const publicKey = addressResult.address;

  if (!publicKey) {
    throw new Error("No public key returned from Freighter.");
  }

  return {
    publicKey,
    network: "TESTNET",
  };
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

    // Handle both string and object return types
    const signResultObj = typeof signResult === 'string' 
      ? { signedTxXdr: signResult, error: '' }
      : signResult;

    if (signResultObj.error) {
      return {
        status: "error",
        error: signResultObj.error ?? "Transaction signing was rejected.",
      };
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signResultObj.signedTxXdr,
      NETWORK_PASSPHRASE
    );

    // Submit via Horizon
    const response = await server.submitTransaction(
      signedTx as any
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
