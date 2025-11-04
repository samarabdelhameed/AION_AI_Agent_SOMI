import { http, createConfig } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { configManager } from './config';

// Contract address type definition
type ContractAddresses = {
  [chainId: number]: {
    [contractName: string]: `0x${string}`;
  };
};

// Enhanced Web3 Configuration Manager
class Web3ConfigManager {
  private wagmiConfig: any;
  private contractAddresses: ContractAddresses;

  constructor() {
    this.contractAddresses = this.loadContractAddresses();
    try {
      this.wagmiConfig = this.createWagmiConfig();
      this.validateConfiguration();
    } catch (error) {
      console.error('❌ Failed to initialize Web3 configuration:', error);
      // Create a minimal fallback config
      this.wagmiConfig = this.createMinimalFallbackConfig();
    }
  }

  private createWagmiConfig() {
    const appConfig = configManager.getConfig();
    
    try {
      // Validate WalletConnect Project ID
      const projectId = appConfig.walletConnectProjectId;
      if (!projectId || projectId === 'default-project-id') {
        console.warn('⚠️ WalletConnect Project ID not configured, using fallback configuration');
        return this.createFallbackConfig(appConfig);
      }

      const config = getDefaultConfig({
        appName: "AION DeFi Platform",
        projectId,
        chains: [bscTestnet, bsc],
        transports: {
          [bsc.id]: http("https://bsc-dataseed.binance.org/"),
          [bscTestnet.id]: http(appConfig.bscTestnetRpc),
        },
        ssr: false,
        // Add wallet connection options to prevent multiple connection attempts
        walletConnectParameters: {
          projectId,
          metadata: {
            name: "AION DeFi Platform",
            description: "The Immortal AI DeFi Agent on BNBChain",
            url: "https://aion-defi.com",
            icons: ["https://aion-defi.com/icon.png"]
          },
          // Prevent multiple connection attempts
          qrModalOptions: {
            themeMode: 'dark',
            themeVariables: {
              '--wcm-z-index': '1000'
            }
          }
        }
      });

      console.log('✅ Web3 configuration created successfully with WalletConnect');
      return config;
    } catch (error) {
      console.error('❌ Failed to create Web3 configuration with WalletConnect:', error);
      console.log('🔄 Falling back to basic configuration...');
      
      return this.createFallbackConfig(appConfig);
    }
  }

  private createFallbackConfig(appConfig: any) {
    try {
      const config = createConfig({
        chains: [bscTestnet, bsc],
        transports: {
          [bsc.id]: http("https://bsc-dataseed.binance.org/"),
          [bscTestnet.id]: http(appConfig.bscTestnetRpc || "https://data-seed-prebsc-1-s1.binance.org:8545/"),
        },
      });

      console.log('✅ Fallback Web3 configuration created successfully');
      return config;
    } catch (error) {
      console.error('❌ Failed to create fallback Web3 configuration:', error);
      throw new Error('Unable to create Web3 configuration');
    }
  }

  private createMinimalFallbackConfig() {
    try {
      const config = createConfig({
        chains: [bscTestnet],
        transports: {
          [bscTestnet.id]: http("https://data-seed-prebsc-1-s1.binance.org:8545/"),
        },
      });

      console.log('✅ Minimal fallback Web3 configuration created successfully');
      return config;
    } catch (error) {
      console.error('❌ Failed to create minimal fallback Web3 configuration:', error);
      // Return a very basic config object to prevent crashes
      return {
        chains: [bscTestnet],
        transports: {
          [bscTestnet.id]: http("https://data-seed-prebsc-1-s1.binance.org:8545/"),
        },
      };
    }
  }

  private loadContractAddresses(): ContractAddresses {
    // Load environment variables with proper validation
    const envVaultTestnet = import.meta.env.VITE_VAULT_ADDRESS_TESTNET as string | undefined;
    const envVaultMainnet = import.meta.env.VITE_VAULT_ADDRESS_MAINNET as string | undefined;

    // Helper function to validate and format addresses
    const formatAddress = (address: string | undefined, fallback: string): `0x${string}` => {
      if (address && address.startsWith('0x') && address.length === 42) {
        return address as `0x${string}`;
      }
      return fallback as `0x${string}`;
    };

    // Helper function to load adapter addresses from environment
    const loadAdapterAddress = (adapterName: string, fallback: string): `0x${string}` => {
      const envKey = `VITE_ADAPTER_${adapterName.toUpperCase()}`;
      const address = (import.meta.env as any)[envKey] as string | undefined;
      return formatAddress(address, fallback);
    };

    // Helper function to load strategy addresses from environment
    const loadStrategyAddress = (strategyName: string, fallback: string): `0x${string}` => {
      const envKey = `VITE_STRATEGY_${strategyName.toUpperCase()}`;
      const address = (import.meta.env as any)[envKey] as string | undefined;
      return formatAddress(address, fallback);
    };

    return {
      [bscTestnet.id]: {
        // Core Contracts - Using the verified working contract
        AION_VAULT: formatAddress(envVaultTestnet, "0x4625bB7f14D4e34F9D11a5Df7566cd7Ec1994849"),
        
        // Strategy Adapters - Load from environment variables
        VENUS_ADAPTER: loadAdapterAddress('VENUS', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        BEEFY_ADAPTER: loadAdapterAddress('BEEFY', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        PANCAKE_ADAPTER: loadAdapterAddress('PANCAKE', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        AAVE_ADAPTER: loadAdapterAddress('AAVE', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        COMPOUND_ADAPTER: loadAdapterAddress('COMPOUND', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        UNISWAP_ADAPTER: loadAdapterAddress('UNISWAP', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        WOMBAT_ADAPTER: loadAdapterAddress('WOMBAT', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        MORPHO_ADAPTER: loadAdapterAddress('MORPHO', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        
        // Strategy Contracts - Load from environment variables
        STRATEGY_VENUS: loadStrategyAddress('VENUS', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        STRATEGY_BEEFY: loadStrategyAddress('BEEFY', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        STRATEGY_PANCAKE: loadStrategyAddress('PANCAKE', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        STRATEGY_AAVE: loadStrategyAddress('AAVE', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        STRATEGY_COMPOUND: loadStrategyAddress('COMPOUND', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        STRATEGY_UNISWAP: loadStrategyAddress('UNISWAP', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        STRATEGY_WOMBAT: loadStrategyAddress('WOMBAT', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
        STRATEGY_MORPHO: loadStrategyAddress('MORPHO', "0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5"),
      },
      [bsc.id]: {
        // Core Contracts
        AION_VAULT: formatAddress(envVaultMainnet, "0x5678901234567890123456789012345678901234"),
        
        // Strategy Adapters - Load from environment variables (with mainnet fallbacks)
        VENUS_ADAPTER: loadAdapterAddress('VENUS', "0x6789012345678901234567890123456789012345"),
        BEEFY_ADAPTER: loadAdapterAddress('BEEFY', "0x7890123456789012345678901234567890123456"),
        PANCAKE_ADAPTER: loadAdapterAddress('PANCAKE', "0x8901234567890123456789012345678901234567"),
        AAVE_ADAPTER: loadAdapterAddress('AAVE', "0x9012345678901234567890123456789012345678"),
        COMPOUND_ADAPTER: loadAdapterAddress('COMPOUND', "0xa123456789012345678901234567890123456789"),
        UNISWAP_ADAPTER: loadAdapterAddress('UNISWAP', "0xb234567890123456789012345678901234567890"),
        WOMBAT_ADAPTER: loadAdapterAddress('WOMBAT', "0xc345678901234567890123456789012345678901"),
        MORPHO_ADAPTER: loadAdapterAddress('MORPHO', "0xd456789012345678901234567890123456789012"),
        
        // Strategy Contracts - Load from environment variables (with mainnet fallbacks)
        STRATEGY_VENUS: loadStrategyAddress('VENUS', "0xe567890123456789012345678901234567890123"),
        STRATEGY_BEEFY: loadStrategyAddress('BEEFY', "0xf678901234567890123456789012345678901234"),
        STRATEGY_PANCAKE: loadStrategyAddress('PANCAKE', "0x1789012345678901234567890123456789012345"),
        STRATEGY_AAVE: loadStrategyAddress('AAVE', "0x2890123456789012345678901234567890123456"),
        STRATEGY_COMPOUND: loadStrategyAddress('COMPOUND', "0x3901234567890123456789012345678901234567"),
        STRATEGY_UNISWAP: loadStrategyAddress('UNISWAP', "0x4012345678901234567890123456789012345678"),
        STRATEGY_WOMBAT: loadStrategyAddress('WOMBAT', "0x5123456789012345678901234567890123456789"),
        STRATEGY_MORPHO: loadStrategyAddress('MORPHO', "0x6234567890123456789012345678901234567890"),
      },
    };
  }

  private validateConfiguration(): void {
    try {
      // Validate wagmi config
      if (!this.wagmiConfig) {
        throw new Error('Wagmi configuration is invalid');
      }

      // Validate chains are configured
      if (!this.wagmiConfig.chains || this.wagmiConfig.chains.length === 0) {
        console.warn('⚠️ No chains configured in wagmi config, using default');
        return;
      }

      // Validate transports are configured
      if (!this.wagmiConfig.transports || Object.keys(this.wagmiConfig.transports).length === 0) {
        console.warn('⚠️ No transports configured in wagmi config, using default');
        return;
      }

      // Validate contract addresses
      const testnetAddresses = this.contractAddresses[bscTestnet.id];
      const mainnetAddresses = this.contractAddresses[bsc.id];

      if (!testnetAddresses?.AION_VAULT || !mainnetAddresses?.AION_VAULT) {
        console.warn('⚠️ Vault addresses not configured properly');
      }

      // Validate address format (non-blocking)
      try {
        this.validateAddressFormat(testnetAddresses.AION_VAULT, 'Testnet AION_VAULT');
        this.validateAddressFormat(mainnetAddresses.AION_VAULT, 'Mainnet AION_VAULT');
      } catch (addressError) {
        console.warn('⚠️ Address validation warning:', addressError);
      }

      // Log loaded adapter addresses for debugging
      this.logLoadedAddresses();

      console.log('✅ Web3 configuration validated successfully', {
        chains: this.wagmiConfig.chains.map((c: any) => c.name || c.id),
        testnetVault: testnetAddresses.AION_VAULT,
        mainnetVault: mainnetAddresses.AION_VAULT,
        transports: Object.keys(this.wagmiConfig.transports),
      });
    } catch (error) {
      console.warn('⚠️ Web3 configuration validation completed with warnings:', error);
      // Don't throw error, just log warning to prevent app crash
    }
  }

  private logLoadedAddresses(): void {
    const testnetAddresses = this.contractAddresses[bscTestnet.id];
    const mainnetAddresses = this.contractAddresses[bsc.id];

    console.log('🔍 Loaded Contract Addresses:');
    console.log('📱 BSC Testnet:');
    console.log('   Vault:', testnetAddresses.AION_VAULT);
    console.log('   Venus Adapter:', testnetAddresses.VENUS_ADAPTER);
    console.log('   Beefy Adapter:', testnetAddresses.BEEFY_ADAPTER);
    console.log('   Pancake Adapter:', testnetAddresses.PANCAKE_ADAPTER);
    console.log('   Aave Adapter:', testnetAddresses.AAVE_ADAPTER);
    console.log('   Compound Adapter:', testnetAddresses.COMPOUND_ADAPTER);
    console.log('   Uniswap Adapter:', testnetAddresses.UNISWAP_ADAPTER);
    console.log('   Wombat Adapter:', testnetAddresses.WOMBAT_ADAPTER);
    console.log('   Morpho Adapter:', testnetAddresses.MORPHO_ADAPTER);

    console.log('🌐 BSC Mainnet:');
    console.log('   Vault:', mainnetAddresses.AION_VAULT);
    console.log('   Venus Adapter:', mainnetAddresses.VENUS_ADAPTER);
    console.log('   Beefy Adapter:', mainnetAddresses.BEEFY_ADAPTER);
    console.log('   Pancake Adapter:', mainnetAddresses.PANCAKE_ADAPTER);
    console.log('   Aave Adapter:', mainnetAddresses.AAVE_ADAPTER);
    console.log('   Compound Adapter:', mainnetAddresses.COMPOUND_ADAPTER);
    console.log('   Uniswap Adapter:', mainnetAddresses.UNISWAP_ADAPTER);
    console.log('   Wombat Adapter:', mainnetAddresses.WOMBAT_ADAPTER);
    console.log('   Morpho Adapter:', mainnetAddresses.MORPHO_ADAPTER);
  }

  private validateAddressFormat(address: string, name: string): void {
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      throw new Error(`Invalid address format for ${name}: ${address}`);
    }
  }

  getConfig() {
    return this.wagmiConfig;
  }

  getContractAddress(chainId: number, contract: string): `0x${string}` {
    // Validate chain ID
    if (!this.contractAddresses[chainId]) {
      throw new Error(`Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(this.contractAddresses).join(', ')}`);
    }

    const addresses = this.contractAddresses[chainId];
    if (!addresses[contract]) {
      const availableContracts = Object.keys(addresses).join(', ');
      throw new Error(`Contract ${contract} not found for chain ${chainId}. Available contracts: ${availableContracts}`);
    }

    return addresses[contract];
  }

  isContractDeployed(chainId: number, contract: string): boolean {
    try {
      const address = this.getContractAddress(chainId, contract);
      // Check if it's not a placeholder address
      const placeholderPatterns = [
        '0x0000000000000000000000000000000000000000',
        '0x1234567890123456789012345678901234567890',
        '0x5678901234567890123456789012345678901234',
      ];
      return !placeholderPatterns.includes(address);
    } catch {
      return false;
    }
  }

  getContractAddresses() {
    return this.contractAddresses;
  }

  getSupportedChains(): number[] {
    return Object.keys(this.contractAddresses).map(Number);
  }

  isChainSupported(chainId: number): boolean {
    return chainId in this.contractAddresses;
  }

  getChainName(chainId: number): string {
    switch (chainId) {
      case bscTestnet.id:
        return 'BSC Testnet';
      case bsc.id:
        return 'BSC Mainnet';
      default:
        return `Chain ${chainId}`;
    }
  }
}

// Create singleton instance
const web3ConfigManager = new Web3ConfigManager();

// Export the wagmi config and utilities
export const config = web3ConfigManager.getConfig();
export const CONTRACT_ADDRESSES = web3ConfigManager.getContractAddresses();
export const getContractAddress = web3ConfigManager.getContractAddress.bind(web3ConfigManager);
export const isContractDeployed = web3ConfigManager.isContractDeployed.bind(web3ConfigManager);
export const getSupportedChains = web3ConfigManager.getSupportedChains.bind(web3ConfigManager);
export const isChainSupported = web3ConfigManager.isChainSupported.bind(web3ConfigManager);
export const getChainName = web3ConfigManager.getChainName.bind(web3ConfigManager);

// Export the manager instance for advanced usage
export const web3Config = web3ConfigManager;

// Strategy metadata for UI
export const STRATEGY_METADATA = {
  venus: {
    name: "Venus Protocol",
    type: "Lending",
    riskLevel: 3,
    description: "Lend BNB on Venus Protocol for stable yields",
    icon: "🪐",
    color: "from-orange-500 to-red-600",
  },
  beefy: {
    name: "Beefy Finance",
    type: "Yield Farming",
    riskLevel: 4,
    description: "Auto-compound yield farming on Beefy",
    icon: "🥩",
    color: "from-green-500 to-green-600",
  },
  pancake: {
    name: "PancakeSwap",
    type: "AMM",
    riskLevel: 5,
    description: "Provide liquidity on PancakeSwap AMM",
    icon: "🥞",
    color: "from-yellow-500 to-orange-600",
  },
  aave: {
    name: "Aave Protocol",
    type: "Lending",
    riskLevel: 3,
    description: "Lend assets on Aave for competitive yields",
    icon: "👻",
    color: "from-purple-500 to-pink-600",
  },
  compound: {
    name: "Compound",
    type: "Lending",
    riskLevel: 3,
    description: "Earn interest by lending on Compound",
    icon: "🏛️",
    color: "from-blue-500 to-indigo-600",
  },
  uniswap: {
    name: "Uniswap V3",
    type: "AMM",
    riskLevel: 5,
    description: "Concentrated liquidity on Uniswap V3",
    icon: "🦄",
    color: "from-pink-500 to-purple-600",
  },
  wombat: {
    name: "Wombat Exchange",
    type: "AMM",
    riskLevel: 4,
    description: "Stable asset AMM on Wombat Exchange",
    icon: "🐹",
    color: "from-teal-500 to-cyan-600",
  },
  morpho: {
    name: "Morpho Protocol",
    type: "Lending",
    riskLevel: 3,
    description: "Optimized lending rates on Morpho",
    icon: "🔷",
    color: "from-indigo-500 to-blue-600",
  },
} as const;


