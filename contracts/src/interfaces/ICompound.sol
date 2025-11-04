// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface ICompound {
    function deposit(uint256 amount) external;
    function withdraw(uint256 shares) external;
    function balanceOf(address account) external view returns (uint256);
    function getPricePerFullShare() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function underlying() external view returns (address);
}
