// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title IStrategy - Interface for yield generation strategies used by AIONVault
/// @notice Describes the required functions, events, and errors for any strategy compatible with AIONVault
/// @dev All amounts are in the smallest unit (Amount (in wei for BNB or smallest unit for token, e.g., 18 decimals))

/// @dev Error thrown when caller is not the Vault
error NotVault();
/// @dev Error thrown when strategy is not initialized
error NotInitialized();
/// @dev Error thrown when trying to initialize more than once
error AlreadyInitialized();

interface IStrategy {
    /// @notice Emitted when a strategy receives a deposit
    /// @param user The address of the user
    /// @param amount Amount (in wei for BNB or smallest unit for token, e.g., 18 decimals)
    event Deposited(address indexed user, uint256 amount);

    /// @notice Emitted when a user withdraws principal
    /// @param user The address of the user
    /// @param amount Amount (in wei for BNB or smallest unit for token, e.g., 18 decimals)
    event Withdrawn(address indexed user, uint256 amount);

    /// @notice Emitted when a user withdraws yield
    /// @param user The address of the user
    /// @param amount Amount (in wei for BNB or smallest unit for token, e.g., 18 decimals)
    event YieldWithdrawn(address indexed user, uint256 amount);

    /// @notice (Optional) Emitted when an emergency withdraw returns funds to the vault
    /// @param recipient The address receiving the emergency withdrawal (usually the vault)
    /// @param totalAmountReturned Amount (in wei for BNB or smallest unit for token, e.g., 18 decimals)
    /// @dev Event emitted when admin pulls all funds to Vault in emergency
    event EmergencyWithdraw(
        address indexed recipient,
        uint256 totalAmountReturned
    );

    /// @notice Deposit BNB or token into the strategy for a specific user
    /// @dev For native BNB, msg.value MUST equal 'amount'. For ERC20/token strategies, msg.value MUST be 0 and the token must be transferred before calling. MUST revert if msg.sender != vaultAddress
    /// @param user The address of the user
    /// @param amount Amount (in wei for BNB or smallest unit for token, e.g., 18 decimals)
    function deposit(address user, uint256 amount) external payable;

    /// @notice Withdraw a specific amount of BNB or token from the strategy for a user
    /// @dev MUST revert if msg.sender != vaultAddress. Withdraws both yield or principal based on vault decision.
    /// @param user The address of the user
    /// @param amount Amount (in wei for BNB or smallest unit for token, e.g., 18 decimals)
    function withdraw(address user, uint256 amount) external;

    /// @notice Withdraw yield only (without touching principal) for a specific user
    /// @dev MUST revert if msg.sender != vaultAddress
    /// @param user The address of the user
    /// @param amount Amount (in wei for BNB or smallest unit for token, e.g., 18 decimals)
    function withdrawYield(address user, uint256 amount) external;

    /// @notice Get current yield generated for a user
    /// @param user The address of the user
    /// @return yieldAmount Amount (in wei for BNB or smallest unit for token, e.g., 18 decimals)
    function getYield(address user) external view returns (uint256 yieldAmount);

    /// @notice Get the total assets (value managed by strategy)
    /// @dev Includes both principal and yield accumulated, net of fees if applicable
    /// @return totalAssets Amount (in wei for BNB or smallest unit for token, e.g., 18 decimals)
    function totalAssets() external view returns (uint256 totalAssets);

    /// @notice Emergency withdraw all funds back to the vault owner (used in emergencies)
    /// @dev MUST revert if msg.sender != vaultAddress
    function emergencyWithdraw() external;

    /// @notice (Optional) Get principal deposited by the user (excluding yield)
    /// @param user The address of the user
    /// @return principalAmount Amount (in wei for BNB or smallest unit for token, e.g., 18 decimals)
    function principalOf(
        address user
    ) external view returns (uint256 principalAmount);

    /// @notice (Optional) Returns the address of the underlying asset (BNB = address(0))
    /// @return asset The address of the underlying asset
    function underlyingAsset() external view returns (address asset);

    /// @notice (Optional) Returns the linked Vault address
    /// @return vaultAddress The address of the vault contract
    function vaultAddress() external view returns (address vaultAddress);

    /// @notice (Optional) Returns the linked Vault address (alias for vaultAddress)
    /// @return vault The address of the vault contract
    function vault() external view returns (address vault);

    /// @notice (Optional) Initialize strategy with necessary config (for upgradable deployments)
    /// @dev Must revert if called more than once. Use OpenZeppelin Initializable with initializer modifier for safety.
    /// @param vault The address of the vault
    /// @param asset The address of the underlying asset
    function initialize(address vault, address asset) external;

    /// @notice (Optional) Returns true if the strategy is initialized
    function isInitialized() external view returns (bool);

    /// @notice (Optional) Returns the name of the strategy
    function strategyName() external view returns (string memory);

    /// @notice (Optional) Returns the type/category of the strategy
    function strategyType() external view returns (string memory);

    /// @notice (Optional) Returns the version of the strategy contract
    function version() external view returns (string memory);

    /// @notice (Optional) Returns estimated APY in basis points (e.g., 450 = 4.50%, -200 = -2.00%). Can be negative for some strategies.
    /// @return apy The estimated annual percentage yield (basis points, can be negative)
    function estimatedAPY() external view returns (int256 apy);

    /// @notice (Optional) Returns the last time the user's position was updated
    /// @param user The address of the user
    /// @return timestamp The last update timestamp (unix)
    function lastUpdated(
        address user
    ) external view returns (uint256 timestamp);

    /// @notice (Optional) Returns the pending rewards for a user (not yet claimed)
    /// @param user The address of the user
    /// @return rewards Amount (in wei for BNB or smallest unit for token, e.g., 18 decimals)
    function pendingRewards(
        address user
    ) external view returns (uint256 rewards);

    /// @notice Returns a human-readable identifier for the strategy interface
    /// @return label The label string, e.g., "IStrategyV1"
    function interfaceLabel() external pure returns (string memory label);

    /// @notice EIP-165: Interface detection
    /// @dev Implementation should return true for INTERFACE_ID and optionally type(IPausableStrategy).interfaceId if supported
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
