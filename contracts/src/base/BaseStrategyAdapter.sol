// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IStrategyAdapter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/**
 * @title BaseStrategyAdapter
 * @notice Abstract base contract for all strategy adapters
 * @dev Provides common functionality, security features, and helper functions
 */
abstract contract BaseStrategyAdapter is
    IStrategyAdapter,
    IStrategyAdapterErrors,
    Ownable,
    ReentrancyGuard,
    Pausable,
    ERC165
{
    using SafeERC20 for IERC20;

    // ========== State Variables ==========

    /// @notice Address of the vault that manages this strategy
    address public immutable vault;

    /// @notice Address of the underlying asset
    address public immutable underlyingAsset;

    /// @notice Total shares issued by this strategy
    uint256 public totalShares;

    /// @notice Mapping of user addresses to their share balances
    mapping(address => uint256) public sharesOf;

    /// @notice Mapping of user addresses to their principal deposits
    mapping(address => uint256) public principalOf;

    /// @notice Mapping of user addresses to their last yield checkpoint
    mapping(address => uint256) public userYieldCheckpoint;

    /// @notice Last time the strategy was updated
    uint256 public lastUpdateTime;

    /// @notice Precision for share calculations (18 decimals)
    uint256 public constant PRECISION = 1e18;

    /// @notice Maximum slippage tolerance (5%)
    uint256 public constant MAX_SLIPPAGE = 500;

    /// @notice Minimum deposit amount to prevent dust
    uint256 public minDeposit = 1e15; // 0.001 tokens

    // ========== Modifiers ==========

    /**
     * @notice Only allows calls from the vault
     */
    modifier onlyVault() {
        if (msg.sender != vault) revert Unauthorized(msg.sender);
        _;
    }

    /**
     * @notice Only allows calls when strategy is healthy
     */
    modifier onlyWhenHealthy() {
        if (!isHealthy()) revert StrategyNotHealthy();
        _;
    }

    /**
     * @notice Validates deposit/withdrawal amounts
     */
    modifier validAmount(uint256 amount) {
        if (amount == 0) revert InvalidAmount(amount);
        _;
    }

    /**
     * @notice Updates the last update timestamp
     */
    modifier updateTimestamp() {
        _;
        lastUpdateTime = block.timestamp;
    }

    // ========== Constructor ==========

    /**
     * @notice Initialize the base strategy adapter
     * @param _vault Address of the managing vault
     * @param _underlyingAsset Address of the underlying asset
     * @param _owner Address of the strategy owner
     */
    constructor(
        address _vault,
        address _underlyingAsset,
        address _owner
    ) Ownable(_owner) {
        if (_vault == address(0)) revert InvalidStrategy(_vault);

        vault = _vault;
        underlyingAsset = _underlyingAsset;
        lastUpdateTime = block.timestamp;
    }

    // ========== Core Functions (Abstract) ==========

    /**
     * @notice Deposit assets into the underlying protocol
     * @dev Must be implemented by derived contracts
     */
    function deposit(
        uint256 amount
    )
        external
        payable
        virtual
        override
        onlyVault
        nonReentrant
        whenNotPaused
        onlyWhenHealthy
        validAmount(amount)
        updateTimestamp
        returns (uint256 shares)
    {
        // Must be implemented by derived contracts
        revert("Not implemented");
    }

    /**
     * @notice Withdraw assets from the underlying protocol
     * @dev Must be implemented by derived contracts
     */
    function withdraw(
        uint256 shares
    )
        external
        virtual
        override
        onlyVault
        nonReentrant
        whenNotPaused
        onlyWhenHealthy
        validAmount(shares)
        updateTimestamp
        returns (uint256 amount)
    {
        // Must be implemented by derived contracts
        revert("Not implemented");
    }

    /**
     * @notice Get total assets managed by this strategy
     * @dev Must be implemented by derived contracts
     */
    function totalAssets() external view virtual override returns (uint256);

    /**
     * @notice Get estimated APY from the underlying protocol
     * @dev Must be implemented by derived contracts
     */
    function estimatedAPY() external view virtual override returns (uint256);

    // ========== Implemented Functions ==========

    /**
     * @notice Get the underlying asset address
     */
    function underlying() external view override returns (address) {
        return underlyingAsset;
    }

    /**
     * @notice Get timestamp of last strategy update
     */
    function lastUpdate() external view override returns (uint256) {
        return lastUpdateTime;
    }

    /**
     * @notice Emergency withdrawal of all assets
     * @dev Can be called by vault or owner in emergency situations
     */
    function emergencyWithdraw()
        external
        virtual
        override
        nonReentrant
        returns (uint256 amount)
    {
        if (msg.sender != vault && msg.sender != owner()) {
            revert Unauthorized(msg.sender);
        }

        amount = _emergencyWithdraw();

        emit EmergencyWithdrawal(amount, "Emergency withdrawal executed");

        return amount;
    }

    // ========== Admin Functions ==========

    /**
     * @notice Pause the strategy
     * @dev Can be called by vault or owner
     */
    function pause() external {
        if (msg.sender != vault && msg.sender != owner()) {
            revert Unauthorized(msg.sender);
        }
        _pause();
    }

    /**
     * @notice Unpause the strategy
     * @dev Can be called by vault or owner
     */
    function unpause() external {
        if (msg.sender != vault && msg.sender != owner()) {
            revert Unauthorized(msg.sender);
        }
        _unpause();
    }

    /**
     * @notice Set minimum deposit amount
     * @param _minDeposit New minimum deposit amount
     */
    function setMinDeposit(uint256 _minDeposit) external onlyOwner {
        minDeposit = _minDeposit;
    }

    // ========== Helper Functions ==========

    /**
     * @notice Calculate shares to mint for a given deposit amount
     * @param depositAmount Amount being deposited
     * @param totalAssetsBefore Total assets before the deposit
     * @return shares Number of shares to mint
     */
    function _calculateShares(
        uint256 depositAmount,
        uint256 totalAssetsBefore
    ) internal virtual view returns (uint256 shares) {
        if (totalShares == 0 || totalAssetsBefore == 0) {
            // First deposit: 1:1 ratio
            shares = depositAmount;
        } else {
            // Subsequent deposits: proportional to existing ratio
            shares = (depositAmount * totalShares) / totalAssetsBefore;
        }
    }

    /**
     * @notice Calculate withdrawal amount for a given number of shares
     * @param sharesToBurn Number of shares being burned
     * @param totalAssetsNow Current total assets
     * @return amount Amount to withdraw
     */
    function _calculateWithdrawal(
        uint256 sharesToBurn,
        uint256 totalAssetsNow
    ) internal virtual view returns (uint256 amount) {
        if (totalShares == 0) return 0;
        amount = (sharesToBurn * totalAssetsNow) / totalShares;
    }

    /**
     * @notice Update user shares after deposit
     * @param user User address
     * @param sharesToAdd Shares to add
     */
    function _mintShares(address user, uint256 sharesToAdd) internal virtual {
        sharesOf[user] += sharesToAdd;
        totalShares += sharesToAdd;
    }

    /**
     * @notice Update user shares after withdrawal
     * @param user User address
     * @param sharesToBurn Shares to burn
     */
    function _burnShares(address user, uint256 sharesToBurn) internal virtual {
        if (sharesOf[user] < sharesToBurn) {
            revert InsufficientShares(sharesToBurn, sharesOf[user]);
        }

        sharesOf[user] -= sharesToBurn;
        totalShares -= sharesToBurn;
    }

    /**
     * @notice Transfer underlying assets to recipient
     * @param recipient Address to receive assets
     * @param amount Amount to transfer
     */
    function _transferUnderlying(address recipient, uint256 amount) internal {
        if (underlyingAsset == address(0)) {
            // Native token (BNB/ETH)
            (bool success, ) = payable(recipient).call{value: amount}("");
            require(success, "Native transfer failed");
        } else {
            // ERC20 token
            IERC20(underlyingAsset).safeTransfer(recipient, amount);
        }
    }

    /**
     * @notice Get balance of underlying asset held by this contract
     * @return balance Current balance
     */
    function _getUnderlyingBalance() internal view returns (uint256 balance) {
        if (underlyingAsset == address(0)) {
            balance = address(this).balance;
        } else {
            balance = IERC20(underlyingAsset).balanceOf(address(this));
        }
    }

    /**
     * @notice Check if an amount is within slippage tolerance
     * @param expected Expected amount
     * @param actual Actual amount received
     * @param maxSlippageBps Maximum slippage in basis points
     */
    function _checkSlippage(
        uint256 expected,
        uint256 actual,
        uint256 maxSlippageBps
    ) internal pure {
        if (actual == 0) return; // Skip check if no amount received

        uint256 minExpected = expected - (expected * maxSlippageBps) / 10000;
        if (actual < minExpected) {
            revert SlippageExceeded(expected, actual);
        }
    }

    /**
     * @notice Check if deadline has passed
     * @param deadline Deadline timestamp
     */
    function _checkDeadline(uint256 deadline) internal view {
        if (block.timestamp > deadline) {
            revert DeadlineExceeded(deadline, block.timestamp);
        }
    }

    // ========== Abstract Functions ==========

    /**
     * @notice Internal emergency withdrawal implementation
     * @dev Must be implemented by derived contracts
     * @return amount Amount withdrawn
     */
    function _emergencyWithdraw() internal virtual returns (uint256 amount);

    /**
     * @notice Check if the underlying protocol is healthy
     * @dev Must be implemented by derived contracts
     * @return healthy True if protocol is operational
     */
    function isHealthy() public view virtual override returns (bool healthy);

    /**
     * @notice Get comprehensive protocol state snapshot
     * @return Protocol metrics including APY, TVL, liquidity, and health
     * @dev Must be implemented by each strategy adapter
     */
    function protocolSnapshot()
        public
        view
        virtual
        override
        returns (ProtocolSnapshot memory);

    // ========== Proof of Yield Implementation ==========

    /**
     * @notice Get user's accrued but unrealized yield
     * @param user Address of the user
     * @return Amount of yield accrued for the user
     * @dev Calculates yield based on user's share of strategy and time elapsed
     */
    function userAccrued(
        address user
    ) public view virtual override returns (uint256) {
        if (sharesOf[user] == 0 || totalShares == 0) {
            return 0;
        }

        uint256 currentAssets = this.totalAssets();
        uint256 userCurrentValue = (sharesOf[user] * currentAssets) /
            totalShares;
        uint256 userPrincipal = principalOf[user];

        return
            userCurrentValue > userPrincipal
                ? userCurrentValue - userPrincipal
                : 0;
    }

    // ========== Interface Support ==========

    /**
     * @notice Check if contract supports a specific interface (EIP-165)
     * @param interfaceId Interface ID to check
     * @return True if interface is supported
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IStrategyAdapter).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // ========== Receive Function ==========

    /**
     * @notice Allow contract to receive native tokens
     */
    receive() external payable virtual {
        // Only accept native tokens if underlying asset is native
        if (underlyingAsset != address(0)) {
            revert("Native tokens not accepted");
        }
    }
}
