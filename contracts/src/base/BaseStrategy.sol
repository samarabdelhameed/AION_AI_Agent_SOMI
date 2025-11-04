// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../interfaces/IStrategy.sol";
import "../interfaces/IPausableStrategy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Error thrown when provided address is zero
error ZeroAddress();

/// @notice Error thrown when caller is not authorized to initialize
error NotAuthorizedToInitialize();

/**
 * @title BaseStrategy - Abstract base contract for yield generation strategies
 * @notice Provides common functionality for all strategies including initialization, pausing, and access control
 * @dev Inherits from IStrategy, IPausableStrategy, and Ownable for complete strategy interface
 * @dev All amounts are in the smallest unit (wei for BNB, smallest unit for tokens)
 */
abstract contract BaseStrategy is IStrategy, IPausableStrategy, Ownable {
    address internal _vault;
    address internal _underlyingAsset;
    bool internal _initialized;
    bool internal _paused;

    // ========== Events ==========
    /// @notice Emitted when strategy is initialized
    /// @param vault The address of the vault
    /// @param asset The address of the underlying asset
    event StrategyInitialized(address indexed vault, address indexed asset);

    // ========== Constructor ==========
    /// @notice Initialize the base strategy with an owner
    /// @param initialOwner The address that will own this strategy
    constructor(address initialOwner) Ownable(initialOwner) {
        // Constructor is empty as initialization is done via initialize()
    }

    // ===========================
    // Modifiers
    // ===========================

    /// @notice Ensures only the vault can call this function
    modifier onlyVault() {
        require(msg.sender == _vault, "Not vault");
        _;
    }

    /// @notice Ensures the strategy is not paused
    modifier notPaused() {
        require(!_paused, "Strategy is paused");
        _;
    }

    /// @notice Ensures the strategy is not already initialized
    modifier notInitializedYet() {
        if (_initialized) revert AlreadyInitialized();
        _;
    }

    /// @notice Ensures only the owner can initialize the strategy
    modifier onlyOwnerOrFactory() {
        require(msg.sender == owner(), "Not authorized to initialize");
        _;
    }

    // ===========================
    // Initialization
    // ===========================

    /// @notice Initialize the strategy with vault and asset addresses
    /// @param vault_ The address of the vault contract
    /// @param asset_ The address of the underlying asset (address(0) for BNB)
    /// @dev Can only be called once by the owner
    /// @dev Sets up the core strategy configuration
    function initialize(
        address vault_,
        address asset_
    ) public virtual override notInitializedYet onlyOwnerOrFactory {
        if (vault_ == address(0)) revert ZeroAddress();
        _vault = vault_;
        _underlyingAsset = asset_;
        _initialized = true;

        emit StrategyInitialized(vault_, asset_);
    }

    // ===========================
    // Pause / Unpause
    // ===========================

    /// @notice Pause all strategy operations
    /// @dev Can be called by vault or owner
    /// @dev Emits Paused event with caller address
    function pause() external override {
        require(
            msg.sender == _vault || msg.sender == owner(),
            "BaseStrategy: caller is not authorized"
        );
        _paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause all strategy operations
    /// @dev Can be called by vault or owner
    /// @dev Emits Unpaused event with caller address
    function unpause() external override {
        require(
            msg.sender == _vault || msg.sender == owner(),
            "BaseStrategy: caller is not authorized"
        );
        _paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Check if the strategy is paused
    /// @return True if strategy is paused, false otherwise
    function isPaused() external view override returns (bool) {
        return _paused;
    }

    /// @notice Check if the strategy is paused (OpenZeppelin-style naming)
    /// @return True if strategy is paused, false otherwise
    /// @dev Alias for isPaused() for frontend compatibility
    function paused() external view returns (bool) {
        return _paused;
    }

    // ===========================
    // View Functions
    // ===========================

    /// @notice Check if the strategy is initialized
    /// @return True if strategy is initialized, false otherwise
    function isInitialized() external view virtual override returns (bool) {
        return _initialized;
    }

    /// @notice Get the address of the vault
    /// @return The address of the current vault
    function vaultAddress() external view virtual override returns (address) {
        return _vault;
    }

    /// @notice Get the address of the underlying asset
    /// @return The address of the underlying asset (address(0) for BNB)
    function underlyingAsset()
        external
        view
        virtual
        override
        returns (address)
    {
        return _underlyingAsset;
    }

    /// @notice Get the principal amount for a user
    /// @return The principal amount for the user
    /// @dev Must be implemented by derived contracts
    function principalOf(
        address /* user */
    ) external view virtual override returns (uint256) {
        revert("Not implemented in base contract");
    }

    /// @notice Get the last update timestamp for a user
    /// @return The last update timestamp for the user
    /// @dev Must be implemented by derived contracts
    function lastUpdated(
        address /* user */
    ) external view virtual override returns (uint256) {
        revert("Not implemented in base contract");
    }

    /// @notice Get the pending rewards for a user
    /// @return The pending rewards for the user
    /// @dev Must be implemented by derived contracts
    function pendingRewards(
        address /* user */
    ) external view virtual override returns (uint256) {
        revert("Not implemented in base contract");
    }

    // ===========================
    // Abstract Functions (Must be implemented by derived contracts)
    // ===========================

    /// @notice Deposit funds into the strategy
    /// @param user The address of the user
    /// @param amount The amount to deposit
    /// @dev Must be implemented by derived contracts
    function deposit(
        address user,
        uint256 amount
    ) external payable virtual override;

    /// @notice Withdraw funds from the strategy
    /// @param user The address of the user
    /// @param amount The amount to withdraw
    /// @dev Must be implemented by derived contracts
    function withdraw(address user, uint256 amount) external virtual override;

    /// @notice Withdraw yield only from the strategy
    /// @param user The address of the user
    /// @param amount The amount of yield to withdraw
    /// @dev Must be implemented by derived contracts
    function withdrawYield(
        address user,
        uint256 amount
    ) external virtual override;

    /// @notice Get the yield for a user
    /// @param user The address of the user
    /// @return The yield amount for the user
    /// @dev Must be implemented by derived contracts
    function getYield(
        address user
    ) external view virtual override returns (uint256);

    /// @notice Get the total assets managed by the strategy
    /// @return The total assets amount
    /// @dev Must be implemented by derived contracts
    function totalAssets() external view virtual override returns (uint256);

    /// @notice Emergency withdraw all funds
    /// @dev Must be implemented by derived contracts
    function emergencyWithdraw() external virtual override;

    // ===========================
    // Interface Support
    // ===========================

    /// @notice Check if the contract supports a specific interface
    /// @param interfaceId The interface ID to check
    /// @return True if the interface is supported, false otherwise
    function supportsInterface(
        bytes4 interfaceId
    )
        external
        view
        virtual
        override(IStrategy, IPausableStrategy)
        returns (bool)
    {
        return
            interfaceId == type(IStrategy).interfaceId ||
            interfaceId == type(IPausableStrategy).interfaceId;
    }

    /// @notice Get the interface label for this strategy
    /// @return The interface label
    function interfaceLabel()
        external
        pure
        virtual
        override(IStrategy, IPausableStrategy)
        returns (string memory)
    {
        return "IStrategy,IPausableStrategy";
    }

    /// @notice Get the contract name
    /// @return The contract name
    function strategyName() external pure virtual returns (string memory) {
        return "BaseStrategy";
    }

    /// @notice Get the strategy type
    /// @return The strategy type
    function strategyType() external pure virtual returns (string memory) {
        return "Abstract";
    }

    /// @notice Get the strategy version
    /// @return The strategy version
    function version() external pure virtual returns (string memory) {
        return "1.0.0";
    }

    /// @notice Get the estimated APY
    /// @return The estimated APY in basis points (can be negative)
    /// @dev Must be implemented by derived contracts
    function estimatedAPY() external view virtual override returns (int256) {
        revert("Not implemented in base contract");
    }
}
