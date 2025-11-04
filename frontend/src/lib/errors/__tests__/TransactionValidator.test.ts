/**
 * Tests for TransactionValidator class
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionValidator, ValidationParams, DEFAULT_VALIDATION_CONFIG } from '../TransactionValidator';
import { TransactionErrorType, ERROR_CODES } from '../types';

// Mock wagmi/actions
vi.mock('wagmi/actions', () => ({
  readContract: vi.fn(),
  getBalance: vi.fn()
}));

// Mock web3Config
vi.mock('../../web3Config', () => ({
  config: {},
  CONTRACT_ADDRESSES: {
    56: {
      AION_VAULT: '0x123456789abcdef'
    }
  }
}));

// Mock contractConfig
vi.mock('../../contractConfig', () => ({
  VAULT_ABI: []
}));

import { readContract, getBalance } from 'wagmi/actions';

const mockReadContract = readContract as any;
const mockGetBalance = getBalance as any;

describe('TransactionValidator', () => {
  let validator: TransactionValidator;
  let validParams: ValidationParams;

  beforeEach(() => {
    validator = new TransactionValidator();
    validParams = {
      chainId: 56,
      userAddress: '0xuser123' as `0x${string}`,
      amountWei: BigInt('1000000000000000000'), // 1 ETH
      gasLimit: BigInt(21000),
      gasPrice: BigInt(5000000000) // 5 gwei
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default configuration', () => {
      const config = validator.getConfig();
      expect(config).toEqual(DEFAULT_VALIDATION_CONFIG);
    });

    it('should merge custom configuration with defaults', () => {
      const customValidator = new TransactionValidator({
        validateBalance: false,
        gasBufferPercent: 30
      });
      
      const config = customValidator.getConfig();
      expect(config.validateBalance).toBe(false);
      expect(config.gasBufferPercent).toBe(30);
      expect(config.validateContract).toBe(true); // Should keep default
    });
  });

  describe('validateTransaction', () => {
    it('should pass validation with valid parameters', async () => {
      // Mock successful contract call
      mockReadContract.mockResolvedValue(BigInt('100000000000000000')); // 0.1 ETH min deposit
      
      // Mock sufficient balance
      mockGetBalance.mockResolvedValue({
        value: BigInt('5000000000000000000') // 5 ETH
      });

      const result = await validator.validateTransaction(validParams);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for unsupported chain', async () => {
      const invalidParams = { ...validParams, chainId: 999 };
      
      const result = await validator.validateTransaction(invalidParams);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(TransactionErrorType.VALIDATION);
      expect(result.errors[0].code).toBe(ERROR_CODES.INVALID_CHAIN);
    });

    it('should fail validation for insufficient balance', async () => {
      // Mock successful contract call
      mockReadContract.mockResolvedValue(BigInt('100000000000000000')); // 0.1 ETH min deposit
      
      // Mock insufficient balance
      mockGetBalance.mockResolvedValue({
        value: BigInt('500000000000000000') // 0.5 ETH (not enough for 1 ETH + gas)
      });

      const result = await validator.validateTransaction(validParams);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(TransactionErrorType.USER);
      expect(result.errors[0].code).toBe(ERROR_CODES.INSUFFICIENT_FUNDS);
    });

    it('should fail validation for amount below minimum deposit', async () => {
      // Mock minimum deposit higher than amount
      mockReadContract.mockResolvedValue(BigInt('2000000000000000000')); // 2 ETH min deposit
      
      // Mock sufficient balance
      mockGetBalance.mockResolvedValue({
        value: BigInt('5000000000000000000') // 5 ETH
      });

      const result = await validator.validateTransaction(validParams);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(TransactionErrorType.VALIDATION);
      expect(result.errors[0].code).toBe(ERROR_CODES.BELOW_MIN_DEPOSIT);
    });

    it('should fail validation when contract is not accessible', async () => {
      // Mock contract call failure
      mockReadContract.mockRejectedValue(new Error('Contract not found'));

      const result = await validator.validateTransaction(validParams);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(TransactionErrorType.CONTRACT);
      expect(result.errors[0].code).toBe(ERROR_CODES.CONTRACT_NOT_FOUND);
    });

    it('should generate warnings for high gas limit', async () => {
      const highGasParams = {
        ...validParams,
        gasLimit: BigInt(1000000) // Very high gas limit
      };

      // Mock successful contract call
      mockReadContract.mockResolvedValue(BigInt('100000000000000000'));
      
      // Mock sufficient balance
      mockGetBalance.mockResolvedValue({
        value: BigInt('10000000000000000000') // 10 ETH
      });

      const result = await validator.validateTransaction(highGasParams);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe(TransactionErrorType.GAS);
    });

    it('should handle validation system errors gracefully', async () => {
      // Mock unexpected error
      mockReadContract.mockImplementation(() => {
        throw new Error('Unexpected system error');
      });

      const result = await validator.validateTransaction(validParams);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(TransactionErrorType.CONTRACT);
      expect(result.errors[0].code).toBe(ERROR_CODES.CONTRACT_NOT_FOUND);
    });
  });

  describe('configuration management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        validateBalance: false,
        gasBufferPercent: 25
      };

      validator.updateConfig(newConfig);
      const config = validator.getConfig();

      expect(config.validateBalance).toBe(false);
      expect(config.gasBufferPercent).toBe(25);
      expect(config.validateContract).toBe(true); // Should keep existing value
    });

    it('should return a copy of configuration', () => {
      const config1 = validator.getConfig();
      const config2 = validator.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });
  });

  describe('gas validation', () => {
    it('should fail validation for gas limit below minimum', async () => {
      // Mock successful contract validation
      mockReadContract.mockResolvedValue(BigInt(1000)); // minDeposit
      mockGetBalance.mockResolvedValue({ value: BigInt('2000000000000000000') }); // 2 BNB

      // Create validator with gas validation enabled but contract validation disabled
      const gasValidator = new TransactionValidator({
        validateContract: false,
        validateMinDeposit: false,
        validateBalance: false,
        validateGas: true,
        minGasLimit: BigInt(21000)
      });

      const lowGasParams = {
        ...validParams,
        gasLimit: BigInt(10000) // Below minimum
      };

      const result = await gasValidator.validateTransaction(lowGasParams);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(TransactionErrorType.GAS);
      expect(result.errors[0].code).toBe(ERROR_CODES.GAS_TOO_LOW);
    });
  });

  describe('balance validation with warnings', () => {
    it('should generate warning for low balance', async () => {
      // Mock successful contract call
      mockReadContract.mockResolvedValue(BigInt('100000000000000000')); // 0.1 ETH min deposit
      
      // Mock balance that's sufficient but very close to minimum (should trigger warning)
      mockGetBalance.mockResolvedValue({
        value: BigInt('1000200000000000000') // 1.0002 ETH (just enough but very close)
      });

      // Use params with smaller amount to trigger warning threshold
      const warningParams = {
        ...validParams,
        amountWei: BigInt('1000000000000000000'), // 1 ETH
        gasPrice: BigInt(5000000000) // 5 gwei
      };

      const result = await validator.validateTransaction(warningParams);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe(TransactionErrorType.USER);
      expect(result.warnings[0].code).toBe(ERROR_CODES.INSUFFICIENT_FUNDS);
    });
  });

  describe('custom vault address', () => {
    it('should validate with custom vault address', async () => {
      const customParams = {
        ...validParams,
        vaultAddress: '0xcustomvault' as `0x${string}`
      };

      // Mock successful contract call
      mockReadContract.mockResolvedValue(BigInt('100000000000000000'));
      
      // Mock sufficient balance
      mockGetBalance.mockResolvedValue({
        value: BigInt('5000000000000000000')
      });

      const result = await validator.validateTransaction(customParams);
      
      expect(result.isValid).toBe(true);
      expect(mockReadContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          address: '0xcustomvault'
        })
      );
    });
  });
});