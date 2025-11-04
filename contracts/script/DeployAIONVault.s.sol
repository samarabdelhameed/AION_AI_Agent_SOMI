// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/AIONVault.sol";
import "../src/strategies/StrategyBeefy.sol";

contract DeployAIONVault is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. عناوين Beefy Finance على BSC Mainnet
        // Beefy BNB Vault (مثال - تأكد من العنوان الصحيح قبل النشر)
        address beefyVaultAddress = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c; // WBNB
        address underlyingToken = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c; // WBNB
        console.log("Using Beefy vault address:", beefyVaultAddress);
        console.log("Using underlying token (WBNB):", underlyingToken);

        // 2. نشر استراتيجية Beefy مع العناوين الصحيحة
        StrategyBeefy strategy = new StrategyBeefy(
            beefyVaultAddress,
            underlyingToken
        );
        console.log("StrategyBeefy deployed at:", address(strategy));

        // 3. نشر AIONVault بالقيم المطلوبة
        AIONVault vault = new AIONVault(0.01 ether, 0.001 ether);
        console.log("AIONVault deployed at:", address(vault));

        // 4. تعيين AI Agent (مطلوب قبل setStrategy)
        vault.setAIAgent(deployer);
        console.log("AI Agent set to:", deployer);

        // 5. تهيئة Strategy مع Vault (Beefy يتطلب underlying token)
        strategy.initialize(address(vault), underlyingToken);
        console.log("Strategy initialized with vault:", address(vault));
        console.log(
            "Strategy initialized with underlying token:",
            underlyingToken
        );

        // 6. ربط الاستراتيجية بالفولت
        vault.setStrategy(address(strategy));
        console.log("Strategy linked to vault");

        // 7. التحقق من الإعداد
        console.log("Verification:");
        console.log("   - Vault strategy:", address(vault.strategy()));
        console.log("   - Vault aiAgent:", address(vault.aiAgent()));
        console.log(
            "   - Beefy vault address:",
            strategy.getBeefyVaultAddress()
        );
        console.log(
            "   - Underlying token:",
            strategy.getUnderlyingTokenAddress()
        );

        vm.stopBroadcast();
    }
}
