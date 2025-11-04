import { formatUnits, parseUnits } from 'viem';

// Utility functions for unit conversion
export const toHuman = (v: bigint, decimals = 18) => Number(formatUnits(v, decimals));
export const toWei = (v: string | number, decimals = 18) => parseUnits(String(v || 0), decimals);

// Validation context type
export type ValidationContext = {
  minDepositWei: bigint;
  balanceWei: bigint;
  gasBufferWei: bigint;
  decimals?: number;
};

// Main validation function
export function validateAmount(input: string, ctx: ValidationContext) {
  const decimals = ctx.decimals ?? 18;
  const errors: string[] = [];
  
  // Empty or not a number
  if (!input?.trim()) {
    errors.push('Amount is required.');
    return { valid: false, errors, amountWei: 0n };
  }
  
  const safe = Number(input);
  if (Number.isNaN(safe) || safe <= 0) {
    errors.push('Enter a valid positive number.');
    return { valid: false, errors, amountWei: 0n };
  }
  
  // Precision guard (max 8 decimals for UX)
  if (/\.\d{9,}$/.test(input)) {
    errors.push('Too many fractional digits (max 8).');
    return { valid: false, errors, amountWei: 0n };
  }
  
  // Convert to wei
  let wei: bigint | null = null;
  try {
    wei = toWei(input, decimals);
  } catch {
    errors.push('Invalid amount format.');
    return { valid: false, errors, amountWei: 0n };
  }
  
  if (wei !== null) {
    // Check minimum deposit
    if (wei < ctx.minDepositWei) {
      const minHuman = toHuman(ctx.minDepositWei, decimals);
      errors.push(`Amount is below the on-chain minimum (≥ ${minHuman} BNB).`);
    }
    
    // Check balance including gas buffer
    const availableBalance = ctx.balanceWei - ctx.gasBufferWei;
    if (wei > availableBalance) {
      const gasHuman = toHuman(ctx.gasBufferWei, decimals);
      errors.push(`Insufficient balance after reserving ~${gasHuman} BNB for gas.`);
    }
  }
  
  return { 
    valid: errors.length === 0, 
    errors, 
    amountWei: wei ?? 0n 
  };
}

// Gas buffer calculation
export const DEFAULT_GAS_BUFFER = parseUnits('0.002', 18); // 0.002 BNB

// Get gas buffer from environment or use default
export function getGasBuffer(): bigint {
  const envGasBuffer = import.meta.env.VITE_GAS_BUFFER_BNB;
  if (envGasBuffer) {
    try {
      return parseUnits(envGasBuffer, 18);
    } catch {
      console.warn('Invalid VITE_GAS_BUFFER_BNB, using default');
    }
  }
  return DEFAULT_GAS_BUFFER;
}
