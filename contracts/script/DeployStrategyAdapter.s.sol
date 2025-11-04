// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/strategies/StrategyUniswap.sol";

contract DeployStrategyAdapter is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Uniswap V3 addresses on BSC Mainnet
        address positionManager = 0x3B16b8B0c14083B220aE5C4f9e1531340b5B3682; // Uniswap V3 PositionManager (checksummed)
        address underlyingToken = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c; // WBNB

        // Deploy StrategyUniswap
        StrategyUniswap strategy = new StrategyUniswap(
            positionManager,
            underlyingToken
        );

        console.log("StrategyUniswap deployed at:", address(strategy));
        console.log("Position Manager:", positionManager);
        console.log("Underlying Token:", underlyingToken);
        console.log("Owner:", deployer);

        vm.stopBroadcast();
    }
}
