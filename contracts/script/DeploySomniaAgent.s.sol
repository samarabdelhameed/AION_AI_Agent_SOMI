// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/AIONVault.sol";
import "../src/SomniaAgent.sol";
import "../src/mocks/SomniaAIMock.sol";
import "../src/strategies/StrategyVenus.sol";
import "../src/strategies/StrategyPancake.sol";

/**
 * @title DeploySomniaAgent
 * @notice Deployment script for AION Vault with Somnia AI Agent
 * @dev Deploys all contracts needed for Somnia AI Hackathon
 */
contract DeploySomniaAgent is Script {
    // Deployment addresses will be logged
    address public vault;
    address public somniaAI;
    address public agent;
    address public venusStrategy;
    address public pancakeStrategy;
    
    // Configuration
    uint256 public constant MIN_DEPOSIT = 0.001 ether; // 0.001 BNB minimum
    uint256 public constant MIN_YIELD_CLAIM = 0.0001 ether; // 0.0001 BNB minimum
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("AION Vault Somnia AI Deployment");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy AION Vault
        console.log("1. Deploying AION Vault...");
        AIONVault vaultContract = new AIONVault(MIN_DEPOSIT, MIN_YIELD_CLAIM);
        vault = address(vaultContract);
        console.log("   Vault deployed at:", vault);
        console.log("");
        
        // 2. Deploy Somnia AI Mock (optional - agent uses real data primarily)
        console.log("2. Deploying Somnia AI Mock (for compatibility)...");
        SomniaAIMock somniaAIContract = new SomniaAIMock();
        somniaAI = address(somniaAIContract);
        console.log("   Somnia AI Mock deployed at:", somniaAI);
        console.log("   Note: Agent uses REAL on-chain data for decisions");
        console.log("");
        
        // 3. Deploy Somnia Agent (uses REAL on-chain data)
        console.log("3. Deploying Somnia Agent...");
        SomniaAgent agentContract = new SomniaAgent(vault, somniaAI);
        agent = address(agentContract);
        console.log("   Somnia Agent deployed at:", agent);
        console.log("   Agent analyzes REAL APY, TVL, and risk data");
        console.log("");
        
        // 4. Set AI Agent in Vault
        console.log("4. Configuring Vault...");
        vaultContract.setAIAgent(agent);
        console.log("   AI Agent set in Vault");
        console.log("");
        
        // 5. Deploy Strategy Adapters (optional for demo)
        console.log("5. Deploying Strategy Adapters...");
        // Note: These are mock addresses for Somnia testnet
        // In production, use actual protocol addresses
        
        // For now, we'll skip strategy deployment as they need protocol addresses
        console.log("   Skipping strategy deployment (add protocol addresses first)");
        console.log("");
        
        vm.stopBroadcast();
        
        // Print deployment summary
        console.log("===========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("===========================================");
        console.log("AION Vault:", vault);
        console.log("Somnia AI Mock:", somniaAI);
        console.log("Somnia Agent:", agent);
        console.log("");
        console.log("Configuration:");
        console.log("  Min Deposit:", MIN_DEPOSIT);
        console.log("  Min Yield Claim:", MIN_YIELD_CLAIM);
        console.log("");
        console.log("Next Steps:");
        console.log("1. Verify contracts on block explorer");
        console.log("2. Add strategy adapters");
        console.log("3. Register strategies in Somnia Agent");
        console.log("4. Test autonomous rebalancing");
        console.log("===========================================");
        
        // Save deployment addresses to file
        _saveDeploymentAddresses();
    }
    
    function _saveDeploymentAddresses() internal {
        string memory json = "deployment";
        
        vm.serializeAddress(json, "vault", vault);
        vm.serializeAddress(json, "somniaAI", somniaAI);
        vm.serializeAddress(json, "agent", agent);
        vm.serializeAddress(json, "deployer", msg.sender);
        string memory finalJson = vm.serializeUint(json, "timestamp", block.timestamp);
        
        string memory fileName = string.concat(
            "./deployments/somnia-",
            vm.toString(block.chainid),
            ".json"
        );
        
        vm.writeJson(finalJson, fileName);
        console.log("Deployment addresses saved to:", fileName);
    }
}

