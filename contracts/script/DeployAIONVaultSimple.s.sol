// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/AIONVault.sol";

contract DeployAIONVaultSimple is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // نشر AIONVault بالقيم المطلوبة
        AIONVault vault = new AIONVault(0.01 ether, 0.001 ether);
        console.log("AIONVault deployed at:", address(vault));

        // تعيين AI Agent
        vault.setAIAgent(deployer);
        console.log("AI Agent set to:", deployer);

        // التحقق من الإعداد
        console.log("Verification:");
        console.log("   - Vault owner:", vault.owner());
        console.log("   - Vault aiAgent:", vault.aiAgent());
        console.log("   - Min deposit:", vault.minDeposit());
        console.log("   - Min yield claim:", vault.minYieldClaim());

        vm.stopBroadcast();
    }
}
