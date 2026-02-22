import { SorobanRpc, xdr, TransactionBuilder, Networks, BASE_FEE, Contract, Transaction } from '@stellar/stellar-sdk';
import { useWallet } from '@/context/wallet-context';

declare global {
  interface Window {
    freighter?: {
      signTransaction: (xdr: string, opts: { networkPassphrase: string; address: string }) => Promise<{ signedTransactionXdr: string }>;
    };
  }
}

const rpcUrl = 'https://soroban-testnet.stellar.org';
const rpc = new SorobanRpc.Server(rpcUrl);
const contractId = 'CONTRACT_ID_HERE'; // Replace with actual contract ID

export async function depositEscrow(amount: string): Promise<{ hash: string; success: boolean; error?: string }> {
  const { wallet } = useWallet();
  
  if (!wallet?.publicKey) {
    return { hash: '', success: false, error: 'Wallet not connected' };
  }

  try {
    const account = await rpc.getAccount(wallet.publicKey);
    
    const contract = new Contract(contractId);
    const call = contract.call('deposit', xdr.ScVal.scvI64(xdr.Int64.fromString((Number(amount) * 10000000).toString())));
    
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(call)
      .setTimeout(30)
      .build();

    const { signedTransactionXdr } = await window.freighter!.signTransaction(transaction.toXDR(), {
      networkPassphrase: Networks.TESTNET,
      address: wallet.publicKey
    });

    const signedTx = TransactionBuilder.fromXDR(signedTransactionXdr, Networks.TESTNET);
    const result = await rpc.sendTransaction(signedTx);
    
    if (result.status === 'PENDING') {
      return { hash: result.hash, success: true };
    } else {
      return { hash: '', success: false, error: result.errorResult?.result().toString() };
    }
  } catch (error) {
    return { hash: '', success: false, error: error instanceof Error ? error.message : 'Transaction failed' };
  }
}

export async function completePayment(escrowId: string): Promise<{ hash: string; success: boolean; error?: string }> {
  const { wallet } = useWallet();
  
  if (!wallet?.publicKey) {
    return { hash: '', success: false, error: 'Wallet not connected' };
  }

  try {
    const account = await rpc.getAccount(wallet.publicKey);
    
    const contract = new Contract(contractId);
    const call = contract.call('complete_payment', xdr.ScVal.scvString(escrowId));
    
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(call)
      .setTimeout(30)
      .build();

    const { signedTransactionXdr } = await window.freighter!.signTransaction(transaction.toXDR(), {
      networkPassphrase: Networks.TESTNET,
      address: wallet.publicKey
    });

    const signedTx = TransactionBuilder.fromXDR(signedTransactionXdr, Networks.TESTNET);
    const result = await rpc.sendTransaction(signedTx);
    
    if (result.status === 'PENDING') {
      return { hash: result.hash, success: true };
    } else {
      return { hash: '', success: false, error: result.errorResult?.result().toString() };
    }
  } catch (error) {
    return { hash: '', success: false, error: error instanceof Error ? error.message : 'Transaction failed' };
  }
}
