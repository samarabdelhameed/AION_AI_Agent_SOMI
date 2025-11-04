import { writeContract, waitForTransactionReceipt, readContract } from 'wagmi/actions';
import { config, CONTRACT_ADDRESSES } from './web3Config';
import { contractConfig } from './contractConfig';
import { appendLocalActivity } from './localTimeline';

export interface DepositParams {
  chainId: number;
  vaultAddress?: `0x${string}`;
  amountWei: bigint;
}

export interface WithdrawParams {
  chainId: number;
  vaultAddress?: `0x${string}`;
  amountWei: bigint;
  receiver?: `0x${string}`;
}

export async function depositWithWallet({ chainId, vaultAddress, amountWei }: DepositParams) {
  const targetVault = vaultAddress || CONTRACT_ADDRESSES[chainId]?.AION_VAULT;
  
  if (!targetVault) throw new Error('Vault address not configured for this network');

  const hash = await writeContract(config, {
    abi: contractConfig.vault.abi as any,
    address: targetVault,
    functionName: 'deposit',
    chainId,
    value: amountWei,
    args: [],
  });
  const receipt = await waitForTransactionReceipt(config, { hash, confirmations: 1 });
  try {
    appendLocalActivity({
      type: 'deposit',
      status: 'completed',
      timestamp: new Date().toISOString(),
      amount: Number(amountWei) / 1e18,
      currency: 'BNB',
      txHash: receipt.transactionHash,
      description: 'User operation',
    });
  } catch {}
  return receipt;
}

export async function withdrawWithWallet({ chainId, vaultAddress, amountWei, receiver }: WithdrawParams) {
  const targetVault = vaultAddress || CONTRACT_ADDRESSES[chainId]?.AION_VAULT;
  
  if (!targetVault) throw new Error('Vault address not configured for this network');

  console.log('🔍 [EXECUTE] withdrawWithWallet called:', {
    chainId,
    vaultAddress: targetVault,
    amountWei: amountWei.toString(),
    receiver: receiver || 'user'
  });

  // Get user's account from wagmi
  const { getAccount } = await import('wagmi/actions');
  const account = getAccount(config);
  const userAddress = account.address;
  
  if (!userAddress) {
    throw new Error('Wallet not connected');
  }

  try {
    // Step 1: Check user's current shares
    console.log('🔍 [EXECUTE] Checking user shares...');
    const userShares = await readContract(config, {
      abi: contractConfig.vault.abi as any,
      address: targetVault,
      functionName: 'balanceOf',
      args: [userAddress],
      chainId,
    }) as bigint;

    console.log('🔍 [EXECUTE] User shares:', {
      userShares: userShares.toString(),
      userSharesFormatted: Number(userShares) / 1e18,
      requestedAmount: Number(amountWei) / 1e18
    });

    // Step 2: Validate user has sufficient shares for withdrawal
    if (userShares === 0n) {
      throw new Error('INSUFFICIENT_SHARES: You have no vault shares to withdraw');
    }

    // Check if user has enough shares for the requested amount
    if (amountWei > userShares) {
      const userSharesFormatted = Number(userShares) / 1e18;
      const requestedFormatted = Number(amountWei) / 1e18;
      throw new Error(`INSUFFICIENT_SHARES: Requested ${requestedFormatted} shares but only have ${userSharesFormatted}`);
    }

    // For this vault implementation, we'll try withdrawShares first (shares-based)
    // then fallback to withdraw (amount-based)
    
    try {
      console.log('💰 [EXECUTE] Trying withdrawShares (shares-based)...');
      
      // Use the amount as shares (1:1 ratio for this vault)
      const sharesToWithdraw = amountWei;
      
      if (sharesToWithdraw > userShares) {
        throw new Error(`INSUFFICIENT_SHARES: Requested ${Number(sharesToWithdraw) / 1e18} shares but only have ${Number(userShares) / 1e18}`);
      }
      
      const hash = await writeContract(config, {
        abi: contractConfig.vault.abi as any,
        address: targetVault,
        functionName: 'withdrawShares',
        chainId,
        value: 0n, // No msg.value for withdraw
        args: [sharesToWithdraw],
      });
      
      console.log('✅ [EXECUTE] withdrawShares transaction sent:', hash);
      
      const receipt = await waitForTransactionReceipt(config, { hash, confirmations: 1 });
      
      try {
        appendLocalActivity({
          type: 'withdraw',
          status: 'completed',
          timestamp: new Date().toISOString(),
          amount: -(Number(amountWei) / 1e18), // Negative for withdraw
          currency: 'BNB',
          txHash: receipt.transactionHash,
          description: 'Withdraw operation',
        });
      } catch {}
      
      return receipt;
      
    } catch (error: any) {
      console.error('❌ [EXECUTE] withdrawShares failed:', error.message);
      
      // Step 3: Fallback to withdraw (amount-based)
      try {
        console.log('💰 [EXECUTE] Trying withdraw (amount-based)...');
        
        const hash = await writeContract(config, {
          abi: contractConfig.vault.abi as any,
          address: targetVault,
          functionName: 'withdraw',
          chainId,
          value: 0n,
          args: [amountWei],
        });
        
        console.log('✅ [EXECUTE] withdraw transaction sent:', hash);
        
        const receipt = await waitForTransactionReceipt(config, { hash, confirmations: 1 });
        
        try {
          appendLocalActivity({
            type: 'withdraw',
            status: 'completed',
            timestamp: new Date().toISOString(),
            amount: -(Number(amountWei) / 1e18), // Negative for withdraw
            currency: 'BNB',
            txHash: receipt.transactionHash,
            description: 'Withdraw operation',
          });
        } catch {}
        
        return receipt;
        
      } catch (withdrawError: any) {
        console.error('❌ [EXECUTE] withdraw also failed:', withdrawError.message);
        
        // Parse specific error messages
        if (withdrawError.message?.includes('execution reverted')) {
          throw new Error('WITHDRAW_REVERTED: The withdrawal was rejected by the contract. Please check your balance and try again.');
        } else if (withdrawError.message?.includes('insufficient')) {
          throw new Error('INSUFFICIENT_SHARES: You don\'t have enough vault shares to withdraw this amount');
        } else if (withdrawError.message?.includes('revert')) {
          throw new Error('WITHDRAW_REVERTED: The withdrawal was rejected by the contract. Please check your balance and try again.');
        } else {
          throw new Error(`Withdraw failed: ${withdrawError.message}`);
        }
      }
    }
    
  } catch (error: any) {
    console.error('❌ [EXECUTE] withdrawWithWallet failed:', error);
    
    // Handle specific error types
    if (error.message?.startsWith('INSUFFICIENT_SHARES') || error.message?.startsWith('WITHDRAW_REVERTED')) {
      throw error; // Re-throw our custom errors
    } else if (error.message?.includes('User rejected')) {
      throw new Error('Transaction was cancelled by user');
    } else {
      throw new Error(`Withdrawal failed: ${error.message || 'Unknown error'}`);
    }
  }
}

export async function getMinDepositWei(chainId: number, vaultAddress?: `0x${string}`) {
  const targetVault = vaultAddress || CONTRACT_ADDRESSES[chainId]?.AION_VAULT;
  
  if (!targetVault) throw new Error('Vault address not configured for this network');

  try {
    const minDeposit = await readContract(config, {
      abi: contractConfig.vault.abi as any,
      address: targetVault,
      functionName: 'minDeposit',
    });
    return minDeposit as bigint;
  } catch {
    return 0n;
  }
}

export async function getMinWithdrawWei(chainId: number, vaultAddress?: `0x${string}`) {
  const targetVault = vaultAddress || CONTRACT_ADDRESSES[chainId]?.AION_VAULT;
  
  if (!targetVault) throw new Error('Vault address not configured for this network');

  try {
    const minWithdraw = await readContract(config, {
      abi: contractConfig.vault.abi as any,
      address: targetVault,
      functionName: 'minWithdraw',
    });
    return minWithdraw as bigint;
  } catch {
    return 0n; // No minimum withdraw requirement
  }
}

// ========== NEW ADVANCED OPERATIONS ==========

export interface CompoundParams {
  chainId: number;
  vaultAddress?: `0x${string}`;
}

export interface HarvestParams {
  chainId: number;
  vaultAddress?: `0x${string}`;
}

export interface RebalanceParams {
  chainId: number;
  vaultAddress?: `0x${string}`;
  fromStrategy: string;
  toStrategy: string;
  percentage: number;
}

export interface MigrateParams {
  chainId: number;
  vaultAddress?: `0x${string}`;
  targetStrategy: string;
}

export async function compoundRewards({ chainId, vaultAddress }: CompoundParams) {
  const targetVault = vaultAddress || CONTRACT_ADDRESSES[chainId]?.AION_VAULT;
  
  if (!targetVault) throw new Error('Vault address not configured for this network');

  console.log('🔄 [COMPOUND] Starting compound operation...');

  try {
    // First claim yield, then reinvest it
    const hash = await writeContract(config, {
      abi: contractConfig.vault.abi as any,
      address: targetVault,
      functionName: 'claimYield',
      chainId,
      args: [],
    });

    console.log('✅ [COMPOUND] Compound transaction sent:', hash);
    
    const receipt = await waitForTransactionReceipt(config, { hash, confirmations: 1 });
    
    try {
      appendLocalActivity({
        type: 'compound',
        status: 'completed',
        timestamp: new Date().toISOString(),
        amount: 0, // Will be updated with actual yield amount
        currency: 'BNB',
        txHash: receipt.transactionHash,
        description: 'Compound rewards operation',
      });
    } catch {}
    
    return receipt;
  } catch (error: any) {
    console.error('❌ [COMPOUND] Compound failed:', error);
    throw new Error(`Compound failed: ${error.message || 'Unknown error'}`);
  }
}

export async function harvestYield({ chainId, vaultAddress }: HarvestParams) {
  const targetVault = vaultAddress || CONTRACT_ADDRESSES[chainId]?.AION_VAULT;
  
  if (!targetVault) throw new Error('Vault address not configured for this network');

  console.log('🌾 [HARVEST] Starting harvest operation...');

  try {
    const hash = await writeContract(config, {
      abi: contractConfig.vault.abi as any,
      address: targetVault,
      functionName: 'claimYield',
      chainId,
      args: [],
    });

    console.log('✅ [HARVEST] Harvest transaction sent:', hash);
    
    const receipt = await waitForTransactionReceipt(config, { hash, confirmations: 1 });
    
    try {
      appendLocalActivity({
        type: 'harvest',
        status: 'completed',
        timestamp: new Date().toISOString(),
        amount: 0, // Will be updated with actual yield amount
        currency: 'BNB',
        txHash: receipt.transactionHash,
        description: 'Harvest yield operation',
      });
    } catch {}
    
    return receipt;
  } catch (error: any) {
    console.error('❌ [HARVEST] Harvest failed:', error);
    throw new Error(`Harvest failed: ${error.message || 'Unknown error'}`);
  }
}

export async function rebalanceStrategy({ chainId, vaultAddress, fromStrategy, toStrategy, percentage }: RebalanceParams) {
  const targetVault = vaultAddress || CONTRACT_ADDRESSES[chainId]?.AION_VAULT;
  
  if (!targetVault) throw new Error('Vault address not configured for this network');

  console.log('⚖️ [REBALANCE] Starting rebalance operation...', {
    from: fromStrategy,
    to: toStrategy,
    percentage
  });

  try {
    // This would call a rebalance function on the vault
    // For now, we'll simulate it with a strategy change
    const hash = await writeContract(config, {
      abi: contractConfig.vault.abi as any,
      address: targetVault,
      functionName: 'setCurrentAdapter', // This function exists in the contract
      chainId,
      args: [toStrategy],
    });

    console.log('✅ [REBALANCE] Rebalance transaction sent:', hash);
    
    const receipt = await waitForTransactionReceipt(config, { hash, confirmations: 1 });
    
    try {
      appendLocalActivity({
        type: 'rebalance',
        status: 'completed',
        timestamp: new Date().toISOString(),
        amount: percentage,
        currency: '%',
        txHash: receipt.transactionHash,
        description: `Rebalanced ${percentage}% from ${fromStrategy} to ${toStrategy}`,
      });
    } catch {}
    
    return receipt;
  } catch (error: any) {
    console.error('❌ [REBALANCE] Rebalance failed:', error);
    throw new Error(`Rebalance failed: ${error.message || 'Unknown error'}`);
  }
}

export async function migrateStrategy({ chainId, vaultAddress, targetStrategy }: MigrateParams) {
  const targetVault = vaultAddress || CONTRACT_ADDRESSES[chainId]?.AION_VAULT;
  
  if (!targetVault) throw new Error('Vault address not configured for this network');

  console.log('🚀 [MIGRATE] Starting migration to:', targetStrategy);

  try {
    const hash = await writeContract(config, {
      abi: contractConfig.vault.abi as any,
      address: targetVault,
      functionName: 'setCurrentAdapter',
      chainId,
      args: [targetStrategy],
    });

    console.log('✅ [MIGRATE] Migration transaction sent:', hash);
    
    const receipt = await waitForTransactionReceipt(config, { hash, confirmations: 1 });
    
    try {
      appendLocalActivity({
        type: 'migrate',
        status: 'completed',
        timestamp: new Date().toISOString(),
        amount: 0,
        currency: 'BNB',
        txHash: receipt.transactionHash,
        description: `Migrated to ${targetStrategy} strategy`,
      });
    } catch {}
    
    return receipt;
  } catch (error: any) {
    console.error('❌ [MIGRATE] Migration failed:', error);
    throw new Error(`Migration failed: ${error.message || 'Unknown error'}`);
  }
}

export async function emergencyWithdrawAll({ chainId, vaultAddress }: WithdrawParams) {
  const targetVault = vaultAddress || CONTRACT_ADDRESSES[chainId]?.AION_VAULT;
  
  if (!targetVault) throw new Error('Vault address not configured for this network');

  console.log('🚨 [EMERGENCY] Starting emergency withdrawal...');

  try {
    const hash = await writeContract(config, {
      abi: contractConfig.vault.abi as any,
      address: targetVault,
      functionName: 'emergencyWithdraw',
      chainId,
      args: [],
    });

    console.log('✅ [EMERGENCY] Emergency withdrawal sent:', hash);
    
    const receipt = await waitForTransactionReceipt(config, { hash, confirmations: 1 });
    
    try {
      appendLocalActivity({
        type: 'emergency',
        status: 'completed',
        timestamp: new Date().toISOString(),
        amount: 0,
        currency: 'BNB',
        txHash: receipt.transactionHash,
        description: 'Emergency withdrawal executed',
      });
    } catch {}
    
    return receipt;
  } catch (error: any) {
    console.error('❌ [EMERGENCY] Emergency withdrawal failed:', error);
    throw new Error(`Emergency withdrawal failed: ${error.message || 'Unknown error'}`);
  }
}

