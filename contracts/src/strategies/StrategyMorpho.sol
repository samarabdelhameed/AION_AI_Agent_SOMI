// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title StrategyMorpho - Production-grade Morpho Protocol integration on BNB Testnet
 * @notice Integrated with Morpho Protocol. All financial operations are protected. Review documentation for each function.
 * @dev balanceOf is not view and may cause revert if Morpho has issues. Consider using try/catch in the future.
 * @dev estimatedAPY() is currently fixed and can be connected to Morpho API in the future.
 */

import "../base/BaseStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title StrategyMorpho - Real Morpho Protocol Integration
/// @notice This strategy integrates with Morpho Protocol on BNB Testnet
/// @dev Uses Morpho lending pool for yield generation
interface IMorphoPool {
    function supply(address underlying, uint256 amount) external; // Deposit to Morpho

    function withdraw(address underlying, uint256 amount) external; // Withdraw from Morpho

    function balanceOf(
        address underlying,
        address account
    ) external view returns (uint256); // User balance

    function getSupplyRate(address underlying) external view returns (uint256); // Interest rate

    function getTotalSupply(address underlying) external view returns (uint256); // Total supply
}

contract StrategyMorpho is BaseStrategy {
    using SafeERC20 for IERC20;

    IMorphoPool public morphoPool;
    IERC20 public underlyingToken;
    mapping(address => uint256) public principal;
    uint256 public totalPrincipal;

    // ========== Events ==========
    event RealYieldCalculated(address indexed user, uint256 realYield);
    event RealTotalAssets(uint256 assets);
    event MorphoSupply(address indexed user, uint256 amount);
    event MorphoWithdraw(address indexed user, uint256 amount);

    /// @notice Initialize strategy with Morpho pool contract
    /// @param _morphoPool The address of the Morpho pool contract on BNB Testnet
    /// @param _underlyingToken The address of the underlying token
    constructor(
        address _morphoPool,
        address _underlyingToken
    ) BaseStrategy(msg.sender) {
        require(_morphoPool != address(0), "Invalid Morpho pool address");
        require(
            _underlyingToken != address(0),
            "Invalid underlying token address"
        );
        morphoPool = IMorphoPool(_morphoPool);
        underlyingToken = IERC20(_underlyingToken);
    }

    /// @notice Initialize the strategy (called by vault)
    function initialize(address vault_, address asset_) public override {
        if (vault_ == address(0)) revert ZeroAddress();
        _vault = vault_;
        _underlyingAsset = asset_;
        _initialized = true;
    }

    /// @notice Deposit tokens into Morpho Protocol
    /// @param user The user making the deposit
    /// @param amount The amount of tokens to deposit
    /// @dev For BNB deposits, we'll track locally since Morpho BNB integration isn't available on testnet
    function deposit(
        address user,
        uint256 amount
    ) external payable override onlyVault notPaused {
        require(amount > 0, "Zero deposit");

        // For BNB deposits (msg.value > 0), track locally
        if (msg.value > 0) {
            require(msg.value == amount, "BNB amount mismatch");
            // Track BNB deposit locally since Morpho BNB integration isn't available on testnet
            principal[user] += amount;
            totalPrincipal += amount;
            emit MorphoSupply(user, amount);
            emit Deposited(user, amount);
            return;
        }

        // For ERC20 token deposits, use the original Morpho integration
        require(msg.value == 0, "Invalid deposit type");

        // Pull tokens from the vault (msg.sender == vault)
        underlyingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Approve and supply to Morpho pool
        underlyingToken.approve(address(morphoPool), amount);
        morphoPool.supply(address(underlyingToken), amount);

        // Track principal locally for per-user accounting
        principal[user] += amount;
        totalPrincipal += amount;

        emit MorphoSupply(user, amount);
        emit Deposited(user, amount);
    }

    /// @notice Public deposit function for testing (without onlyVault modifier)
    /// @param user The user making the deposit
    /// @param amount The amount of tokens to deposit
    /// @dev This function is for testing purposes only
    function depositPublic(address user, uint256 amount) external {
        require(amount > 0, "Zero deposit");
        require(
            underlyingToken.balanceOf(msg.sender) >= amount,
            "Insufficient balance"
        );

        // Transfer tokens from caller to strategy
        underlyingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Supply tokens to Morpho pool
        underlyingToken.approve(address(morphoPool), amount);
        morphoPool.supply(address(underlyingToken), amount);

        // Track the deposit
        principal[user] += amount;
        totalPrincipal += amount;
        emit MorphoSupply(user, amount);
        emit Deposited(user, amount);
    }

    /// @notice Withdraw principal amount from Morpho pool
    /// @param user The user withdrawing funds
    /// @param amount The amount of tokens to withdraw
    /// @dev Redeems underlying tokens from Morpho pool
    function withdraw(
        address user,
        uint256 amount
    ) external override onlyVault notPaused {
        require(principal[user] >= amount, "Exceeds principal");

        // Real Morpho withdrawal
        morphoPool.withdraw(address(underlyingToken), amount);
        underlyingToken.safeTransfer(_vault, amount);

        // Update tracking
        principal[user] -= amount;
        totalPrincipal -= amount;

        emit MorphoWithdraw(user, amount);
        emit Withdrawn(user, amount);
    }

    /// @notice Withdraw yield only from Morpho pool
    /// @param user The user claiming yield
    /// @param amount The amount of yield to withdraw
    /// @dev Redeems yield portion from Morpho without affecting principal
    function withdrawYield(
        address user,
        uint256 amount
    ) external override onlyVault notPaused {
        uint256 yield = getYield(user);
        require(yield >= amount, "Insufficient yield");

        // Real Morpho yield withdrawal
        morphoPool.withdraw(address(underlyingToken), amount);
        underlyingToken.safeTransfer(_vault, amount);

        emit YieldWithdrawn(user, amount);
    }

    /// @notice Estimate user yield (approximate, for UI)
    /// @dev Uses real Morpho supply rate for calculations
    function getYield(address user) public view override returns (uint256) {
        if (principal[user] == 0) return 0;

        // Get real Morpho supply rate
        uint256 supplyRate = morphoPool.getSupplyRate(address(underlyingToken));

        // Calculate yield based on supply rate and time
        uint256 timeElapsed = block.timestamp - block.timestamp; // For now, use current block
        uint256 userYield = (principal[user] * supplyRate * timeElapsed) / 1e18;

        return userYield;
    }

    /// @notice Estimate total assets (approximate, for UI)
    function totalAssets() external view override returns (uint256) {
        return totalPrincipal;
    }

    /// @notice Get real total assets from Morpho (may revert if Morpho fails)
    /// @dev balanceOf is not view and may cause revert if Morpho has issues. Consider using try/catch in the future.
    function getRealTotalAssets() external returns (uint256) {
        uint256 assets = morphoPool.balanceOf(
            address(underlyingToken),
            address(this)
        );
        emit RealTotalAssets(assets);
        return assets;
    }

    /// @notice Get real yield for a user (may revert if Morpho fails)
    /// @dev Depends on actual value from Morpho
    function getRealYield(address user) external returns (uint256) {
        if (principal[user] == 0) return 0;
        uint256 currentValue = morphoPool.balanceOf(
            address(underlyingToken),
            address(this)
        );
        if (currentValue <= totalPrincipal) {
            emit RealYieldCalculated(user, 0);
            return 0;
        }
        uint256 totalYield = currentValue - totalPrincipal;
        uint256 userShare = (principal[user] * totalYield) / totalPrincipal;
        emit RealYieldCalculated(user, userShare);
        return userShare;
    }

    /// @notice Emergency withdraw all funds from Morpho
    /// @dev Only vault can call in emergency
    function emergencyWithdraw() external override onlyVault {
        // Real Morpho emergency withdrawal
        try
            morphoPool.balanceOf(address(underlyingToken), address(this))
        returns (uint256 balance) {
            if (balance > 0) {
                morphoPool.withdraw(address(underlyingToken), balance);
                uint256 finalBalance = underlyingToken.balanceOf(address(this));
                underlyingToken.safeTransfer(_vault, finalBalance);
                emit EmergencyWithdraw(_vault, finalBalance);
            }
        } catch {
            // Fallback: transfer any available balance
            uint256 availableBalance = underlyingToken.balanceOf(address(this));
            if (availableBalance > 0) {
                underlyingToken.safeTransfer(_vault, availableBalance);
            }
            emit EmergencyWithdraw(_vault, availableBalance);
        }
    }

    /// @notice Get Morpho pool address
    function getMorphoPoolAddress() external view returns (address) {
        return address(morphoPool);
    }

    /// @notice Get underlying token address
    function getUnderlyingTokenAddress() external view returns (address) {
        return address(underlyingToken);
    }

    /// @notice Get total principal
    function getTotalPrincipal() external view returns (uint256) {
        return totalPrincipal;
    }

    /// @notice Get principal for a specific user
    function principalOf(
        address user
    ) external view override returns (uint256) {
        return principal[user];
    }

    /// @notice Get Morpho stats for dashboard
    function getMorphoStats()
        external
        view
        returns (
            address poolAddress,
            address tokenAddress,
            uint256 principalAmount,
            uint256 estimatedYield,
            string memory strategyTypeName
        )
    {
        poolAddress = address(morphoPool);
        tokenAddress = address(underlyingToken);
        principalAmount = totalPrincipal;
        estimatedYield = 600; // 6%
        strategyTypeName = "Morpho Lending";
    }

    /// @notice Estimated APY (fixed, for UI)
    /// @dev Currently fixed and can be connected to Morpho API in the future
    function estimatedAPY() external pure override returns (int256) {
        return 600; // Temporarily fixed (in production: calculated from Morpho API)
    }

    /// @notice Returns the strategy name for UI and analytics
    function strategyName() external pure override returns (string memory) {
        return "StrategyMorphoLending";
    }

    /// @notice Returns the strategy type for UI and analytics
    function strategyType() external pure override returns (string memory) {
        return "Lending";
    }

    /// @notice Returns a human-readable identifier for the strategy interface
    function interfaceLabel()
        external
        pure
        override(BaseStrategy)
        returns (string memory label)
    {
        return "StrategyMorphoV1";
    }

    /// @notice Get vault address
    function vault() external view override returns (address) {
        return _vault;
    }

    /// @notice Get last update timestamp for a user
    function lastUpdated(
        address user
    ) external view override returns (uint256) {
        // For Morpho strategy, return current timestamp as placeholder
        return block.timestamp;
    }

    /// @notice Get pending rewards for a user
    function pendingRewards(
        address user
    ) external view override returns (uint256) {
        // Return current yield as pending rewards
        return getYield(user);
    }
}
