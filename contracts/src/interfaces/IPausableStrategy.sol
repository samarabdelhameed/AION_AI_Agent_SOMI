// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IPausableStrategy - Optional interface for modular pausable strategies
/// @notice Allows strategies to implement emergency pause/unpause functionality

interface IPausableStrategy {
    /// @notice Pause the strategy (for emergency use)
    /// @dev MUST revert if msg.sender != vaultAddress
    function pause() external;

    /// @notice Unpause the strategy (resume normal operation)
    /// @dev MUST revert if msg.sender != vaultAddress
    function unpause() external;

    /// @notice Returns true if the strategy is currently paused
    /// @return paused Boolean indicating whether the strategy is paused
    function isPaused() external view returns (bool paused);

    /// @notice Emitted when the strategy is paused
    /// @param by The address that triggered the pause
    event Paused(address indexed by);

    /// @notice Emitted when the strategy is unpaused
    /// @param by The address that triggered the unpause
    event Unpaused(address indexed by);

    /// @notice (Optional) EIP-165 support for interface detection
    /// @param interfaceId The interface identifier, as specified in ERC-165
    /// @return supported True if the contract implements interfaceId
    function supportsInterface(
        bytes4 interfaceId
    ) external view returns (bool supported);

    /// @notice Returns a label string for this interface (e.g., "IPausableStrategyV1")
    function interfaceLabel() external pure returns (string memory label);
}
