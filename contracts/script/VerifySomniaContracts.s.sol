// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";

/**
 * @title VerifySomniaContracts
 * @notice Helper script to verify deployed contracts on Somnia block explorer
 * @dev Run this after deployment to verify all contracts
 */
contract VerifySomniaContracts is Script {
    
    function run() external {
        // Load deployment addresses
        string memory root = vm.projectRoot();
        string memory path = string.concat(
            root,
            "/deployments/somnia-",
            vm.toString(block.chainid),
            ".json"
        );
        
        string memory json = vm.readFile(path);
        
        address vault = vm.parseJsonAddress(json, ".vault");
        address somniaAI = vm.parseJsonAddress(json, ".somniaAI");
        address agent = vm.parseJsonAddress(json, ".agent");
        
        console.log("===========================================");
        console.log("Contract Verification Information");
        console.log("===========================================");
        console.log("");
        
        // Vault verification command
        console.log("1. Verify AION Vault:");
        console.log("   Address:", vault);
        console.log("   Command:");
        _printVerifyCommand("src/AIONVault.sol:AIONVault", vault, _getVaultConstructorArgs());
        console.log("");
        
        // Somnia AI Mock verification command
        console.log("2. Verify Somnia AI Mock:");
        console.log("   Address:", somniaAI);
        console.log("   Command:");
        _printVerifyCommand("src/mocks/SomniaAIMock.sol:SomniaAIMock", somniaAI, "");
        console.log("");
        
        // Somnia Agent verification command
        console.log("3. Verify Somnia Agent:");
        console.log("   Address:", agent);
        console.log("   Command:");
        _printVerifyCommand("src/SomniaAgent.sol:SomniaAgent", agent, _getAgentConstructorArgs(vault, somniaAI));
        console.log("");
        
        console.log("===========================================");
    }
    
    function _printVerifyCommand(
        string memory contractPath,
        address contractAddress,
        string memory constructorArgs
    ) internal pure {
        console.log(
            string.concat(
                "   forge verify-contract \\",
                "\n     --chain-id ", vm.toString(block.chainid),
                " \\",
                "\n     --etherscan-api-key YOUR_API_KEY \\",
                "\n     --watch \\",
                "\n     ", vm.toString(contractAddress),
                " \\",
                "\n     ", contractPath
            )
        );
        
        if (bytes(constructorArgs).length > 0) {
            console.log(string.concat("     --constructor-args ", constructorArgs));
        }
    }
    
    function _getVaultConstructorArgs() internal pure returns (string memory) {
        // MIN_DEPOSIT = 0.001 ether = 1000000000000000
        // MIN_YIELD_CLAIM = 0.0001 ether = 100000000000000
        return "0000000000000000000000000000000000000000000000000038d7ea4c680000000000000000000000000000000000000000000000000000005af3107a4000";
    }
    
    function _getAgentConstructorArgs(
        address vault,
        address somniaAI
    ) internal pure returns (string memory) {
        return string.concat(
            vm.toString(vault),
            vm.toString(somniaAI)
        );
    }
}

