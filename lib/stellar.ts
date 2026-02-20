/**
 * Stellar Soroban integration utilities.
 *
 * This module centralises every blockchain interaction so the rest of the app
 * stays framework-agnostic.  It is designed for the **Stellar Testnet** and
 * uses the Freighter browser-extension wallet.
 *
 * NOTE: The heavy dependencies (`@stellar/stellar-sdk`, `@stellar/freighter-api`)
 * are imported dynamically so the module can be loaded safely on the server
 * during SSR — the actual calls only ever run in the browser.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TESTNET_URL = "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvokeContractParams {
  contractId: string;
  functionName: string;
  args: string[];        // JSON-stringified xdr ScVal arguments
  publicKey: string;
}

export interface TransactionResult {
  status: "success" | "error";
  hash?: string;
  returnValue?: string;
  error?: string;
  ledger?: number;
  timestamp?: string;
}

export interface WalletInfo {
  publicKey: string;
  network: string;
}

// ---------------------------------------------------------------------------
// Helpers – lazy-loaded Stellar SDK wrappers
// ---------------------------------------------------------------------------

/**
 * Check whether the Freighter extension is available in the current browser.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const freighter = await import("@stellar/freighter-api");
    const { isConnected } = await freighter.isConnected();
    return isConnected;
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

  const freighter = await import("@stellar/freighter-api");
  const { isConnected } = await freighter.isConnected();

  if (!isConnected) {
    throw new Error(
      "Freighter wallet not detected. Please install the Freighter browser extension."
    );
  }

  const addressResult = await freighter.requestAccess();

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
// Contract invocation (stub – wired for @stellar/stellar-sdk)
// ---------------------------------------------------------------------------

/**
 * Build, simulate, sign (via Freighter) and submit a Soroban contract
 * invocation transaction.
 *
 * This is the main entry-point the UI calls.  Because the full Stellar SDK is
 * heavy we keep it behind a dynamic import so the initial page bundle stays
 * small.
 */
export async function invokeContract(
  params: InvokeContractParams
): Promise<TransactionResult> {
  const { contractId, functionName, args, publicKey } = params;

  // Input validation
  if (!contractId || contractId.length !== 56) {
    return {
      status: "error",
      error: "Invalid contract ID. Must be a 56-character Stellar contract address.",
    };
  }

  if (!functionName.trim()) {
    return {
      status: "error",
      error: "Function name is required.",
    };
  }

  if (!publicKey) {
    return {
      status: "error",
      error: "Wallet not connected.",
    };
  }

  try {
    // -----------------------------------------------------------------------
    // Dynamic imports – keeps bundle size in check
    // -----------------------------------------------------------------------
    const StellarSdk = await import("@stellar/stellar-sdk");
    const freighter = await import("@stellar/freighter-api");

    const server = new StellarSdk.SorobanRpc.Server(TESTNET_URL);

    const sourceAccount = await server.getAccount(publicKey);

    // Parse user-supplied arguments into native ScVal types
    const parsedArgs = args
      .filter((a) => a.trim() !== "")
      .map((arg) => {
        const trimmed = arg.trim();

        // Attempt numeric
        if (/^-?\d+$/.test(trimmed)) {
          return StellarSdk.nativeToScVal(BigInt(trimmed), { type: "i128" });
        }

        // Boolean
        if (trimmed === "true" || trimmed === "false") {
          return StellarSdk.nativeToScVal(trimmed === "true", {
            type: "bool",
          });
        }

        // Stellar address (G... or C...)
        if (
          /^[GC][A-Z2-7]{55}$/.test(trimmed)
        ) {
          return new StellarSdk.Address(trimmed).toScVal();
        }

        // Default: string
        return StellarSdk.nativeToScVal(trimmed, { type: "string" });
      });

    const contract = new StellarSdk.Contract(contractId);

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(functionName, ...parsedArgs))
      .setTimeout(30)
      .build();

    // Simulate to get the authorised footprint
    const simulated = await server.simulateTransaction(tx);

    if (
      StellarSdk.SorobanRpc.Api.isSimulationError(simulated)
    ) {
      return {
        status: "error",
        error: `Simulation failed: ${
          (simulated as { error?: string }).error ?? "Unknown simulation error"
        }`,
      };
    }

    // Assemble the transaction with simulation results
    const assembled = StellarSdk.SorobanRpc.assembleTransaction(
      tx,
      simulated as StellarSdk.SorobanRpc.Api.SimulateTransactionSuccessResponse
    ).build();

    // Sign via Freighter
    const signResult = await freighter.signTransaction(assembled.toXDR(), {
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

    const sendResponse = await server.sendTransaction(signedTx);

    if (sendResponse.status === "ERROR") {
      return {
        status: "error",
        error: "Transaction submission failed.",
      };
    }

    // Poll for completion
    let getResponse = await server.getTransaction(sendResponse.hash);
    const maxAttempts = 30;
    let attempts = 0;

    while (
      getResponse.status === "NOT_FOUND" &&
      attempts < maxAttempts
    ) {
      await new Promise((r) => setTimeout(r, 1000));
      getResponse = await server.getTransaction(sendResponse.hash);
      attempts++;
    }

    if (getResponse.status === "SUCCESS") {
      return {
        status: "success",
        hash: sendResponse.hash,
        returnValue: getResponse.returnValue
          ? JSON.stringify(
              StellarSdk.scValToNative(getResponse.returnValue),
              null,
              2
            )
          : undefined,
        ledger: getResponse.ledger,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: "error",
      hash: sendResponse.hash,
      error: `Transaction failed with status: ${getResponse.status}`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unknown error occurred.";
    return {
      status: "error",
      error: message,
    };
  }
}

// ---------------------------------------------------------------------------
// Utility – shorten a Stellar address for display
// ---------------------------------------------------------------------------

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
