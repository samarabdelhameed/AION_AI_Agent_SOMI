// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title Protocol Snapshot Data Structure
 * @notice Comprehensive protocol state snapshot for proof-of-yield
 */
struct ProtocolSnapshot {
    uint256 apyBps; // APY in basis points (e.g., 500 = 5.00%)
    uint256 tvl; // Total Value Locked in the protocol
    uint256 liquidity; // Available liquidity for withdrawals
    uint256 utilization; // Utilization rate in basis points
    uint256 lastUpdate; // Timestamp of last update
    bool isHealthy; // Protocol health status
    string protocolName; // Human-readable protocol name
}

/**
 * @title Strategy Snapshot Data Structure
 * @notice Strategy-specific metrics for vault reporting
 */
struct StrategySnapshot {
    address adapter; // Strategy adapter address
    uint256 totalAssets; // Total assets managed by strategy
    uint256 totalShares; // Total shares issued
    uint256 sharePrice; // Price per share (in underlying)
    uint256 apy; // Current APY in basis points
    uint256 allocation; // Allocation percentage in basis points
    bool isActive; // Whether strategy is currently active
    uint256 lastRebalance; // Timestamp of last rebalance
}

/**
 * @title User Earnings Data Structure
 * @notice User-specific earnings breakdown
 */
struct UserEarnings {
    uint256 realized; // Realized gains from withdrawals
    uint256 unrealized; // Unrealized gains from share appreciation
    uint256 totalDeposited; // Total amount deposited by user
    uint256 currentBalance; // Current balance including gains
    uint256 yieldEarned; // Total yield earned to date
    uint256 timestamp; // Timestamp of calculation
}

/**
 * @title IStrategyAdapter - Unified Strategy Interface
 * @notice Standard interface for all yield strategy adapters in the AION Vault system
 * @dev All strategy adapters must implement this interface for seamless integration
 * @dev Supports EIP-165 interface detection
 */
interface IStrategyAdapter is IERC165 {
    // ========== Core Functions ==========

    /**
     * @notice Deposit assets into the underlying protocol
     * @param amount Amount of underlying assets to deposit
     * @return shares Number of strategy shares minted
     * @dev Must emit Deposited event on success
     */
    function deposit(uint256 amount) external payable returns (uint256 shares);

    /**
     * @notice Withdraw assets from the underlying protocol
     * @param shares Number of strategy shares to burn
     * @return amount Amount of underlying assets withdrawn
     * @dev Must emit Withdrawn event on success
     */
    function withdraw(uint256 shares) external returns (uint256 amount);

    /**
     * @notice Get total assets managed by this strategy
     * @return Total value of assets in underlying token terms
     * @dev Should reflect real-time value from the protocol
     */
    function totalAssets() external view returns (uint256);

    /**
     * @notice Get estimated annual percentage yield
     * @return APY in basis points (e.g., 500 = 5.00%)
     * @dev Should fetch real-time APY from the underlying protocol
     */
    function estimatedAPY() external view returns (uint256);

    /**
     * @notice Get the underlying asset address
     * @return Address of the underlying token (address(0) for native ETH/BNB)
     */
    function underlying() external view returns (address);

    /**
     * @notice Get total shares in the strategy
     * @return Total number of shares issued
     */
    function totalShares() external view returns (uint256);

    // ========== Metadata Functions ==========

    /**
     * @notice Get human-readable strategy name
     * @return Strategy name (e.g., "Venus BNB Strategy")
     */
    function name() external view returns (string memory);

    /**
     * @notice Get underlying protocol name
     * @return Protocol name (e.g., "Venus Protocol")
     */
    function protocolName() external view returns (string memory);

    /**
     * @notice Get risk level of this strategy
     * @return Risk level from 1 (lowest) to 10 (highest)
     */
    function riskLevel() external view returns (uint8);

    // ========== Health Check Functions ==========

    /**
     * @notice Check if the strategy is healthy and operational
     * @return True if strategy can accept deposits/withdrawals
     * @dev Should check underlying protocol status
     */
    function isHealthy() external view returns (bool);

    /**
     * @notice Get timestamp of last strategy update
     * @return Block timestamp of last significant update
     */
    function lastUpdate() external view returns (uint256);

    // ========== Emergency Functions ==========

    /**
     * @notice Emergency withdrawal of all assets
     * @return amount Total amount withdrawn in emergency
     * @dev Only callable by authorized addresses (vault/owner)
     */
    function emergencyWithdraw() external returns (uint256 amount);

    // ========== Proof of Yield Functions ==========

    /**
     * @notice Get comprehensive protocol state snapshot
     * @return Protocol metrics including APY, TVL, liquidity, and health
     * @dev Provides real-time data from underlying protocol for transparency
     */
    function protocolSnapshot() external view returns (ProtocolSnapshot memory);

    /**
     * @notice Get user's accrued but unrealized yield
     * @param user Address of the user
     * @return Amount of yield accrued for the user
     * @dev Calculates yield based on user's share of strategy and time elapsed
     */
    function userAccrued(address user) external view returns (uint256);

    /**
     * @notice Get user's share balance in this strategy
     * @param user Address of the user
     * @return Number of strategy shares owned by user
     */
    function sharesOf(address user) external view returns (uint256);

    /**
     * @notice Get user's principal (initial deposit) amount
     * @param user Address of the user
     * @return Principal amount deposited by user
     */
    function principalOf(address user) external view returns (uint256);

    // ========== Events ==========

    /**
     * @notice Emitted when assets are deposited
     * @param user Address of the depositor
     * @param amount Amount of underlying assets deposited
     * @param shares Number of strategy shares minted
     */
    event Deposited(address indexed user, uint256 amount, uint256 shares);

    /**
     * @notice Emitted when assets are withdrawn
     * @param user Address of the withdrawer
     * @param shares Number of strategy shares burned
     * @param amount Amount of underlying assets withdrawn
     */
    event Withdrawn(address indexed user, uint256 shares, uint256 amount);

    /**
     * @notice Emitted when yield is accrued
     * @param oldTotal Previous total assets
     * @param newTotal New total assets after yield
     * @param yield Amount of yield accrued
     */
    event YieldAccrued(uint256 oldTotal, uint256 newTotal, uint256 yield);

    /**
     * @notice Emitted when protocol encounters an error
     * @param reason Human-readable error description
     * @param data Additional error data from the protocol
     */
    event ProtocolError(string reason, bytes data);

    /**
     * @notice Emitted during emergency withdrawal
     * @param amount Total amount withdrawn
     * @param reason Reason for emergency withdrawal
     */
    event EmergencyWithdrawal(uint256 amount, string reason);

    /**
     * @notice Emitted when strategy is rebalanced
     * @param from Source adapter address
     * @param to Destination adapter address
     * @param amount Amount rebalanced
     * @param timestamp Block timestamp
     */
    event StrategyRebalanced(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 indexed timestamp
    );

    /**
     * @notice Emitted when yield is realized by a user
     * @param user User address
     * @param adapter Strategy adapter address
     * @param amount Yield amount realized
     * @param timestamp Block timestamp
     */
    event YieldRealized(
        address indexed user,
        address indexed adapter,
        uint256 amount,
        uint256 indexed timestamp
    );

    /**
     * @notice Emitted when adapter health status changes
     * @param adapter Strategy adapter address
     * @param healthy Current health status
     * @param apyBps Current APY in basis points
     * @param tvl Total value locked
     * @param timestamp Block timestamp
     */
    event AdapterHealthUpdate(
        address indexed adapter,
        bool indexed healthy,
        uint256 apyBps,
        uint256 tvl,
        uint256 indexed timestamp
    );
}

/**
 * @title Strategy Adapter Errors
 * @notice Custom errors for strategy adapter implementations
 */
interface IStrategyAdapterErrors {
    /// @notice Strategy is not healthy for operations
    error StrategyNotHealthy();

    /// @notice Insufficient liquidity in the protocol
    error InsufficientLiquidity(uint256 requested, uint256 available);

    /// @notice Protocol-specific error occurred
    error ProtocolErrorCustom(string protocol, bytes data);

    /// @notice Invalid strategy configuration
    error InvalidStrategy(address strategy);

    /// @notice Unauthorized access attempt
    error Unauthorized(address caller);

    /// @notice Invalid amount provided
    error InvalidAmount(uint256 amount);

    /// @notice Insufficient shares for withdrawal
    error InsufficientShares(uint256 requested, uint256 available);

    /// @notice Operation failed due to slippage
    error SlippageExceeded(uint256 expected, uint256 actual);

    /// @notice Deadline exceeded for time-sensitive operations
    error DeadlineExceeded(uint256 deadline, uint256 current);

    /// @notice Strategy is paused
    error StrategyPaused();
}
