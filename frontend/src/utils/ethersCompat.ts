// Ethers.js compatibility layer for React frontend
import { ethers } from 'ethers';

// Re-export commonly used ethers components
export { ethers };

// Export specific types and classes
export const BrowserProvider = ethers.BrowserProvider;
export const Contract = ethers.Contract;

// BigNumber is now just a type alias for bigint in v6
export type BigNumber = bigint;

// Format utilities - these are now direct functions in v6
export const formatEther = ethers.formatEther;
export const parseEther = ethers.parseEther;
export const formatUnits = ethers.formatUnits;
export const parseUnits = ethers.parseUnits;

// Address utilities
export const isAddress = ethers.isAddress;
export const getAddress = ethers.getAddress;

// Hash utilities
export const keccak256 = ethers.keccak256;
export const sha256 = ethers.sha256;

// Signature utilities
export const verifyMessage = ethers.verifyMessage;

// Note: splitSignature is not available in ethers v6
// Use ethers.Signature.from() instead

// Network utilities
// Note: getNetwork is not available in ethers v6
// Use provider.getNetwork() instead

// Export common constants
export const ZeroAddress = ethers.ZeroAddress;
export const MaxUint256 = ethers.MaxUint256;

// Create a utils object for backward compatibility
export const utils = {
  parseEther: ethers.parseEther,
  formatEther: ethers.formatEther,
  parseUnits: ethers.parseUnits,
  formatUnits: ethers.formatUnits,
  isAddress: ethers.isAddress,
  getAddress: ethers.getAddress,
  keccak256: ethers.keccak256,
  sha256: ethers.sha256,
  verifyMessage: ethers.verifyMessage,
  // Remove splitSignature as it's not available in v6
  // Remove getNetwork as it's not available in v6
};