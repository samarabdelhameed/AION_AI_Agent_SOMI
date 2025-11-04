import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withdrawWithWallet } from '../lib/tx';
import { writeContract, waitForTransactionReceipt, readContract } from 'wagmi/actions';

// Mock wagmi actions
vi.mock('wagmi/actions', () => ({
  writeContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  readContract: vi.fn(),
  getAccount: vi.fn(),
}));

// Mock config
vi.mock('../lib/web3Config', () => ({
  config: {},
  CONTRACT_ADDRESSES: {
    97: {
      AION_VAULT: '0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849'
    }
  }
}));

// Mock contract config
vi.mock('../lib/contractConfig', () => ({
  contractConfig: {
    vault: {
      abi: []
    }
  }
}));

// Mock local timeline
vi.mock('../lib/localTimeline', () => ({
  appendLocalActivity: vi.fn()
}));

const mockWriteContract = writeContract as any;
const mockWaitForTransactionReceipt = waitForTransactionReceipt as any;
const mockReadContract = readContract as any;

describe('withdrawWithWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock getAccount to return a connected account
    vi.doMock('wagmi/actions', async () => {
      const actual = await vi.importActual('wagmi/actions');
      return {
        ...actual,
        getAccount: vi.fn(() => ({
          address: '0xF26f945C1e73278157c24C1dCBb8A19227547D29'
        }))
      };
    });
  });

  it('should successfully withdraw using withdrawShares', async () => {
    // Mock user has sufficient shares
    mockReadContract.mockResolvedValue(BigInt('1000000000000000000')); // 1 BNB worth of shares
    
    // Mock successful transaction
    const mockTxHash = '0x123456789abcdef';
    const mockReceipt = { transactionHash: mockTxHash };
    
    mockWriteContract.mockResolvedValue(mockTxHash);
    mockWaitForTransactionReceipt.mockResolvedValue(mockReceipt);

    const result = await withdrawWithWallet({
      chainId: 97,
      vaultAddress: '0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849' as `0x${string}`,
      amountWei: BigInt('500000000000000000') // 0.5 BNB
    });

    expect(result).toEqual(mockReceipt);
    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        functionName: 'withdrawShares',
        args: [BigInt('500000000000000000')],
        value: 0n
      })
    );
  });

  it('should fallback to withdraw function if withdrawShares fails', async () => {
    // Mock user has sufficient shares
    mockReadContract.mockResolvedValue(BigInt('1000000000000000000'));
    
    // Mock withdrawShares fails, withdraw succeeds
    const mockTxHash = '0x123456789abcdef';
    const mockReceipt = { transactionHash: mockTxHash };
    
    mockWriteContract
      .mockRejectedValueOnce(new Error('withdrawShares not supported'))
      .mockResolvedValue(mockTxHash);
    mockWaitForTransactionReceipt.mockResolvedValue(mockReceipt);

    const result = await withdrawWithWallet({
      chainId: 97,
      vaultAddress: '0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849' as `0x${string}`,
      amountWei: BigInt('500000000000000000')
    });

    expect(result).toEqual(mockReceipt);
    expect(mockWriteContract).toHaveBeenCalledTimes(2);
    expect(mockWriteContract).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        functionName: 'withdraw',
        args: [BigInt('500000000000000000')],
        value: 0n
      })
    );
  });

  it('should throw INSUFFICIENT_SHARES error when user has no shares', async () => {
    // Mock user has no shares
    mockReadContract.mockResolvedValue(BigInt('0'));

    await expect(withdrawWithWallet({
      chainId: 97,
      vaultAddress: '0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849' as `0x${string}`,
      amountWei: BigInt('500000000000000000')
    })).rejects.toThrow('INSUFFICIENT_SHARES: You have no vault shares to withdraw');
  });

  it('should throw INSUFFICIENT_SHARES error when requesting more than available', async () => {
    // Mock user has 0.3 BNB worth of shares but requests 0.5 BNB
    mockReadContract.mockResolvedValue(BigInt('300000000000000000')); // 0.3 BNB

    await expect(withdrawWithWallet({
      chainId: 97,
      vaultAddress: '0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849' as `0x${string}`,
      amountWei: BigInt('500000000000000000') // 0.5 BNB
    })).rejects.toThrow('INSUFFICIENT_SHARES: Requested 0.5 shares but only have 0.3');
  });

  it('should handle wallet not connected error', async () => {
    // Mock getAccount returns no address
    vi.doMock('wagmi/actions', async () => {
      const actual = await vi.importActual('wagmi/actions');
      return {
        ...actual,
        getAccount: vi.fn(() => ({ address: undefined }))
      };
    });

    await expect(withdrawWithWallet({
      chainId: 97,
      vaultAddress: '0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849' as `0x${string}`,
      amountWei: BigInt('500000000000000000')
    })).rejects.toThrow('Wallet not connected');
  });

  it('should handle contract revert errors gracefully', async () => {
    mockReadContract.mockResolvedValue(BigInt('1000000000000000000'));
    
    // Mock both functions fail with revert
    mockWriteContract
      .mockRejectedValueOnce(new Error('execution reverted: insufficient balance'))
      .mockRejectedValue(new Error('execution reverted: insufficient balance'));

    await expect(withdrawWithWallet({
      chainId: 97,
      vaultAddress: '0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849' as `0x${string}`,
      amountWei: BigInt('500000000000000000')
    })).rejects.toThrow('WITHDRAW_REVERTED: The withdrawal was rejected by the contract');
  });
});