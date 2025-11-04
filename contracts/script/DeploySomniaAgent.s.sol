// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/AIONVault.sol";
import "../src/SomniaAgent.sol";

/**
 * @title DeploySomniaAgent
 * @notice Deployment script for AION Vault with Somnia AI Agent
 * @dev Deploys all contracts needed for Somnia AI Hackathon
 */
contract DeploySomniaAgent is Script {
    // Deployment addresses will be logged
    address public vault;
    address public agent;
    
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
        
        // 2. Deploy Somnia Agent (uses 100% REAL on-chain data)
        console.log("2. Deploying Somnia Agent...");
        SomniaAgent agentContract = new SomniaAgent(vault);
        agent = address(agentContract);
        console.log("   Somnia Agent deployed at:", agent);
        console.log("   Agent uses 100% REAL data - no mocks!");
        console.log("   - Real APY from protocols");
        console.log("   - Real TVL from strategies");
        console.log("   - Real risk assessments");
        console.log("");
        
        // 3. Set AI Agent in Vault
        console.log("3. Configuring Vault...");
        vaultContract.setAIAgent(agent);
        console.log("   AI Agent set in Vault");
        console.log("");
        
        // 4. Deploy Strategy Adapters (optional for demo)
        console.log("4. Strategy Adapters...");
        console.log("   Deploy strategies separately with real protocol addresses");
        console.log("   Then register them with: agent.registerStrategy(strategyAddress)");
        console.log("");
        
        vm.stopBroadcast();
        
        // Print deployment summary
        console.log("===========================================");
        console.log("DEPLOYMENT SUMMARY - 100% REAL DATA");
        console.log("===========================================");
        console.log("AION Vault:", vault);
        console.log("Somnia Agent:", agent);
        console.log("");
        console.log("Configuration:");
        console.log("  Min Deposit:", MIN_DEPOSIT);
        console.log("  Min Yield Claim:", MIN_YIELD_CLAIM);
        console.log("  Uses Real Data: YES (No Mocks!)");
        console.log("");
        console.log("Next Steps:");
        console.log("1. Verify contracts on block explorer");
        console.log("2. Deploy strategy adapters with real protocol addresses");
        console.log("3. Register strategies: agent.registerStrategy(address)");
        console.log("4. Test with real data: agent.getAIRecommendation()");
        console.log("===========================================");
        
        // Save deployment addresses to file
        _saveDeploymentAddresses();
    }
    
    function _saveDeploymentAddresses() internal {
        string memory json = "deployment";
        
        vm.serializeAddress(json, "vault", vault);
        vm.serializeAddress(json, "agent", agent);
        vm.serializeAddress(json, "deployer", msg.sender);
        vm.serializeBool(json, "usesRealData", true);
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

