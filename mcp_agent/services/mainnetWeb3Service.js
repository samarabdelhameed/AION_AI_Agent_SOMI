/**
 * @fileoverview Mainnet Web3 Service Configuration
 * @description Enhanced Web3 service specifically configured for BSC Mainnet with real contract addresses
 */

import { Web3Service } from './web3Service.js';

export class MainnetWeb3Service extends Web3Service {
  constructor(configManager, errorManager, options = {}) {
    // Mainnet-specific configuration
    const mainnetOptions = {
      networks: ['bscMainnet', 'bscTestnet'],
      defaultNetwork: 'bscMainnet',
      confirmations: 3, // Higher confirmations for mainnet
      timeout: 300000, // 5 minutes
      ...options
    };

    super(configManager, errorManager, mainnetOptions);

    // Mainnet contract addresses
    this.mainnetContracts = {
      aionVault: '0xB176c1FA7B3feC56cB23681B6E447A7AE60C5254',
      strategies: {
        venus: '0x9D20A69E95CFEc37E5BC22c0D4218A705d90EdcB',
        aave: '0xd34A6Cbc0f9Aab0B2896aeFb957cB00485CD56Db',
        compound: '0x5B7575272cB12317EB5D8E8D9620A9A34A7a3dE4',
        wombat: '0xF8C5804Bdf6875EBB6cCf70Fc7f3ee6745Cecd98',
        beefy: '0x3a5EB0C7c7Ae43598cd31A1e23Fd722e40ceF5F4',
        morpho: '0x75B0EF811CB728aFdaF395a0b17341fb426c26dD',
        pancake: '0xf2116eE783Be82ba51a6Eda9453dFD6A1723d205',
        uniswap: '0xBd992799d17991933316de4340135C5f240334E6'
      }
    };

    // Protocol addresses on BSC Mainnet
    this.protocolAddresses = {
      venus: {
        comptroller: '0xfD36E2c2a6789Db23113685031d7F16329158384',
        vBNB: '0xA07c5b74C9B40447a954e1466938b865b6BBea36',
        vUSDT: '0xfD5840Cd36d94D7229439859C0112a4185BC0255',
        vBUSD: '0x95c78222B3D6e262426483D42CfA53685A67Ab9D'
      },
      pancakeswap: {
        router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
        factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
        masterChef: '0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652'
      },
      tokens: {
        BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'
      }
    };
  }

  /**
   * Get mainnet contract address
   */
  getMainnetContractAddress(contractType, strategy = null) {
    if (contractType === 'aionVault') {
      return this.mainnetContracts.aionVault;
    }
    
    if (contractType === 'strategy' && strategy) {
      return this.mainnetContracts.strategies[strategy.toLowerCase()];
    }
    
    throw new Error(`Contract not found: ${contractType}${strategy ? `.${strategy}` : ''}`);
  }

  /**
   * Get protocol address
   */
  getProtocolAddress(protocol, contract = null) {
    if (!this.protocolAddresses[protocol]) {
      throw new Error(`Protocol not found: ${protocol}`);
    }
    
    if (contract) {
      if (!this.protocolAddresses[protocol][contract]) {
        throw new Error(`Contract not found in protocol ${protocol}: ${contract}`);
      }
      return this.protocolAddresses[protocol][contract];
    }
    
    return this.protocolAddresses[protocol];
  }

  /**
   * Execute AION Vault function on mainnet
   */
  async executeVaultFunction(functionName, params = [], options = {}) {
    const vaultAddress = this.getMainnetContractAddress('aionVault');
    return await this.executeContractFunction(vaultAddress, functionName, params, {
      network: 'bscMainnet',
      ...options
    });
  }

  /**
   * Execute strategy function on mainnet
   */
  async executeStrategyFunction(strategy, functionName, params = [], options = {}) {
    const strategyAddress = this.getMainnetContractAddress('strategy', strategy);
    return await this.executeContractFunction(strategyAddress, functionName, params, {
      network: 'bscMainnet',
      ...options
    });
  }

  /**
   * Get vault statistics from mainnet
   */
  async getVaultStats() {
    try {
      const vaultAddress = this.getMainnetContractAddress('aionVault');
      const contract = await this.getContract(vaultAddress, 'bscMainnet');
      
      const [
        totalAssets,
        totalShares,
        owner,
        aiAgent,
        minDeposit,
        minYieldClaim,
        paused
      ] = await Promise.all([
        contract.totalAssets(),
        contract.totalShares(),
        contract.owner(),
        contract.aiAgent(),
        contract.minDeposit(),
        contract.minYieldClaim(),
        contract.paused()
      ]);

      return {
        totalAssets: totalAssets.toString(),
        totalShares: totalShares.toString(),
        owner,
        aiAgent,
        minDeposit: minDeposit.toString(),
        minYieldClaim: minYieldClaim.toString(),
        paused,
        network: 'bscMainnet',
        contractAddress: vaultAddress,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get vault stats: ${error.message}`);
    }
  }

  /**
   * Get strategy information from mainnet
   */
  async getStrategyInfo(strategy) {
    try {
      const strategyAddress = this.getMainnetContractAddress('strategy', strategy);
      const contract = await this.getContract(strategyAddress, 'bscMainnet');
      
      const [
        owner,
        testMode,
        paused
      ] = await Promise.all([
        contract.owner(),
        contract.testMode ? contract.testMode() : Promise.resolve(false),
        contract.paused ? contract.paused() : Promise.resolve(false)
      ]);

      return {
        strategy,
        address: strategyAddress,
        owner,
        testMode,
        paused,
        network: 'bscMainnet',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get strategy info for ${strategy}: ${error.message}`);
    }
  }

  /**
   * Get all strategies information
   */
  async getAllStrategiesInfo() {
    const strategies = Object.keys(this.mainnetContracts.strategies);
    const results = {};
    
    for (const strategy of strategies) {
      try {
        results[strategy] = await this.getStrategyInfo(strategy);
      } catch (error) {
        results[strategy] = {
          error: error.message,
          strategy,
          network: 'bscMainnet',
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return results;
  }

  /**
   * Get mainnet network status
   */
  async getMainnetStatus() {
    return await this.getNetworkStatus('bscMainnet');
  }

  /**
   * Get all network statuses (mainnet and testnet)
   */
  async getAllNetworkStatuses() {
    return await this.getAllNetworkStatuses();
  }

  /**
   * Switch to mainnet
   */
  async switchToMainnet() {
    await this.switchNetwork('bscMainnet');
  }

  /**
   * Switch to testnet
   */
  async switchToTestnet() {
    await this.switchNetwork('bscTestnet');
  }

  /**
   * Get mainnet-specific metrics
   */
  getMainnetMetrics() {
    const baseStats = this.getStats();
    
    return {
      ...baseStats,
      mainnetContracts: {
        total: Object.keys(this.mainnetContracts.strategies).length + 1, // +1 for vault
        vault: this.mainnetContracts.aionVault,
        strategies: Object.keys(this.mainnetContracts.strategies).length
      },
      supportedProtocols: Object.keys(this.protocolAddresses).length,
      currentNetwork: this.defaultNetwork,
      isMainnet: this.defaultNetwork === 'bscMainnet'
    };
  }
}

export default MainnetWeb3Service;
