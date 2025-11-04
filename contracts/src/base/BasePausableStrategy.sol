// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IPausableStrategy.sol";

error NotVault();

abstract contract BasePausableStrategy is IPausableStrategy {
    address internal _vault;
    bool internal _paused;

    modifier onlyVault() {
        if (msg.sender != _vault) revert NotVault();
        _;
    }

    modifier notPaused() {
        require(!_paused, "Strategy is paused");
        _;
    }

    function pause() external override onlyVault {
        _paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external override onlyVault {
        _paused = false;
        emit Unpaused(msg.sender);
    }

    function isPaused() external view override returns (bool) {
        return _paused;
    }

    function _setVault(address vault_) internal {
        require(vault_ != address(0), "Invalid vault address");
        _vault = vault_;
    }

    function vaultAddress() public view virtual returns (address) {
        return _vault;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public pure virtual override returns (bool) {
        return interfaceId == type(IPausableStrategy).interfaceId;
    }
}
