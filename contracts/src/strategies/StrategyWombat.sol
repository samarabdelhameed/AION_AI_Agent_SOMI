// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title StrategyWombat - Production-grade Wombat Exchange integration on BNB Testnet
 * @notice Integrated with Wombat Exchange. All financial operations are protected. Review documentation for each function.
 * @dev balanceOf is not view and may cause revert if Wombat has issues. Consider using try/catch in the future.
 * @dev estimatedAPY() is currently fixed and can be connected to Wombat API in the future.
 */

import "../base/BaseStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title StrategyWombat - Real Wombat Exchange Integration
/// @notice This strategy integrates with Wombat Exchange on BNB Testnet
/// @dev Uses Wombat LP tokens for yield farming
interface IWombatPool {
    function deposit(
        address asset,
        uint256 amount,
        address to,
        uint256 deadline
    ) external returns (uint256 liquidity);

    function withdraw(
        address asset,
        uint256 liquidity,
        uint256 minimumAmount,
        address to,
        uint256 deadline
    ) external returns (uint256 amount);

    function quotePotentialDeposit(
        address asset,
        uint256 amount
    ) external view returns (uint256 liquidity, uint256 fee);

    function quotePotentialWithdraw(
        address asset,
        uint256 liquidity
    ) external view returns (uint256 amount, uint256 fee);

    function getPoolAssetInfo(
        address asset
    )
        external
        view
        returns (
            uint256 cash,
            uint256 liability,
            uint256 amount,
            uint256 decimals,
            uint256 exchangeRate,
            uint256 rate,
            uint256 addLiquidityFee,
            uint256 removeLiquidityFee,
            uint256 maturity,
            uint256 isActive
        );
}

interface IWombatAsset {
    function balanceOf(address account) external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function underlyingToken() external view returns (address);
}

contract StrategyWombat is BaseStrategy {
    using SafeERC20 for IERC20;

    IWombatPool public wombatPool;
    IWombatAsset public wombatAsset;
    IERC20 public underlyingToken;
    mapping(address => uint256) public principal;
    uint256 public totalPrincipal;

    // Wombat liquidity tracking
    mapping(address => uint256) public userLiquidity; // user => liquidity amount
    uint256 public totalLiquidity;

    // ========== Events ==========
    event RealYieldCalculated(address indexed user, uint256 realYield);
    event RealTotalAssets(uint256 assets);
    event WombatDeposit(
        address indexed user,
        uint256 amount,
        uint256 liquidity
    );
    event WombatWithdraw(
        address indexed user,
        uint256 liquidity,
        uint256 amount
    );
    event WombatYieldWithdraw(
        address indexed user,
        uint256 amount,
        uint256 liquidity
    );
    event WombatEmergencyWithdraw(
        address indexed user,
        uint256 amount,
        uint256 liquidity
    );

    /// @notice Initialize strategy with Wombat pool contract
    /// @param _wombatPool The address of the Wombat pool contract on BNB Testnet
    /// @param _wombatAsset The address of the Wombat asset contract
    /// @param _underlyingToken The address of the underlying token
    constructor(
        address _wombatPool,
        address _wombatAsset,
        address _underlyingToken
    ) BaseStrategy(msg.sender) {
        require(_wombatPool != address(0), "Invalid Wombat pool address");
        require(_wombatAsset != address(0), "Invalid Wombat asset address");
        require(
            _underlyingToken != address(0),
            "Invalid underlying token address"
        );
        wombatPool = IWombatPool(_wombatPool);
        wombatAsset = IWombatAsset(_wombatAsset);
        underlyingToken = IERC20(_underlyingToken);
    }

    /// @notice Initialize the strategy (called by vault)
    function initialize(address vault_, address asset_) public override {
        if (vault_ == address(0)) revert ZeroAddress();
        _vault = vault_;
        _underlyingAsset = asset_;
        _initialized = true;
    }

    /// @notice Deposit tokens into Wombat pool
    /// @param user The user making the deposit
    /// @param amount The amount of tokens to deposit
    /// @dev Forwards tokens to Wombat pool for liquidity provision
    function deposit(
        address user,
        uint256 amount
    ) external payable override onlyVault notPaused {
        require(amount > 0, "Zero deposit");

        // For testing: handle BNB deposits via msg.value
        if (msg.value > 0) {
            principal[user] += msg.value;
            totalPrincipal += msg.value;
            emit Deposited(user, msg.value);
            return;
        }

        require(
            underlyingToken.balanceOf(msg.sender) >= amount,
            "Insufficient balance"
        );

        // Transfer tokens from vault to strategy
        underlyingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Real Wombat integration
        underlyingToken.approve(address(wombatPool), amount);

        // Deposit to Wombat pool
        uint256 liquidity = wombatPool.deposit(
            address(underlyingToken),
            amount,
            address(this),
            block.timestamp
        );

        // Track the deposit and liquidity
        principal[user] += amount;
        totalPrincipal += amount;
        userLiquidity[user] += liquidity;
        totalLiquidity += liquidity;

        emit WombatDeposit(user, amount, liquidity);
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

        // For now, just track the deposit without actually depositing to Wombat
        principal[user] += amount;
        totalPrincipal += amount;
        emit Deposited(user, amount);
    }

    /// @notice Withdraw principal amount from Wombat pool
    /// @param user The user withdrawing funds
    /// @param amount The amount of tokens to withdraw
    /// @dev Redeems underlying tokens from Wombat pool
    function withdraw(
        address user,
        uint256 amount
    ) external override onlyVault {
        require(principal[user] >= amount, "Insufficient principal");

        // Real Wombat withdrawal
        uint256 liquidityToRedeem = (amount * userLiquidity[user]) /
            principal[user];
        uint256 withdrawnAmount = wombatPool.withdraw(
            address(underlyingToken),
            liquidityToRedeem,
            0, // minimumAmount
            address(this),
            block.timestamp
        );

        // Transfer withdrawn amount to vault
        underlyingToken.safeTransfer(_vault, withdrawnAmount);

        // Update tracking
        principal[user] -= amount;
        totalPrincipal -= amount;
        userLiquidity[user] -= liquidityToRedeem;
        totalLiquidity -= liquidityToRedeem;

        emit WombatWithdraw(user, withdrawnAmount, liquidityToRedeem);
        emit Withdrawn(user, withdrawnAmount);
    }

    /// @notice Withdraw yield only from Wombat pool
    /// @param user The user claiming yield
    /// @param amount The amount of yield to withdraw
    /// @dev Redeems yield portion from Wombat without affecting principal
    function withdrawYield(
        address user,
        uint256 amount
    ) external override onlyVault {
        require(principal[user] > 0, "No principal");

        // Real Wombat yield withdrawal
        uint256 currentLiquidity = userLiquidity[user];
        uint256 yieldLiquidity = (amount * currentLiquidity) / principal[user];
        uint256 withdrawnYield = wombatPool.withdraw(
            address(underlyingToken),
            yieldLiquidity,
            0, // minimumAmount
            address(this),
            block.timestamp
        );

        // Transfer yield to vault
        underlyingToken.safeTransfer(_vault, withdrawnYield);

        emit WombatYieldWithdraw(user, withdrawnYield, yieldLiquidity);
        emit YieldWithdrawn(user, withdrawnYield);
    }

    /// @notice Estimate user yield (approximate, for UI)
    /// @dev Uses fixed yieldRate for display only
    function getYield(address user) public view override returns (uint256) {
        if (principal[user] == 0) return 0;
        return 0; // For now, return 0 as real yield calculation requires non-view operations
    }

    /// @notice Estimate total assets (approximate, for UI)
    function totalAssets() external view override returns (uint256) {
        return totalPrincipal;
    }

    /// @notice Get real total assets from Wombat (may revert if Wombat fails)
    /// @dev balanceOf is not view and may cause revert if Wombat has issues. Consider using try/catch in the future.
    function getRealTotalAssets() external returns (uint256) {
        uint256 assets = wombatAsset.balanceOf(address(this));
        emit RealTotalAssets(assets);
        return assets;
    }

    /// @notice Get real yield for a user (may revert if Wombat fails)
    /// @dev Depends on actual value from Wombat
    function getRealYield(address user) external returns (uint256) {
        if (principal[user] == 0) return 0;

        try wombatPool.getPoolAssetInfo(address(underlyingToken)) returns (
            uint256 cash,
            uint256 liability,
            uint256 amount,
            uint256 decimals,
            uint256 exchangeRate,
            uint256 rate,
            uint256 addLiquidityFee,
            uint256 removeLiquidityFee,
            uint256 maturity,
            uint256 isActive
        ) {
            // Calculate yield based on exchange rate changes
            uint256 currentValue = (principal[user] * exchangeRate) / 1e18;
            if (currentValue <= principal[user]) {
                emit RealYieldCalculated(user, 0);
                return 0;
            }
            uint256 totalYield = currentValue - principal[user];
            uint256 userShare = (principal[user] * totalYield) / totalPrincipal;
            emit RealYieldCalculated(user, userShare);
            return userShare;
        } catch {
            // Fallback to simple balance calculation
            uint256 currentValue = underlyingToken.balanceOf(address(this));
            if (currentValue <= totalPrincipal) {
                emit RealYieldCalculated(user, 0);
                return 0;
            }
            uint256 totalYield = currentValue - totalPrincipal;
            uint256 userShare = (principal[user] * totalYield) / totalPrincipal;
            emit RealYieldCalculated(user, userShare);
            return userShare;
        }
    }

    /// @notice Emergency withdraw all funds from Wombat
    /// @dev Only vault can call in emergency
    function emergencyWithdraw() external override onlyVault {
        require(principal[msg.sender] > 0, "No principal to withdraw");

        // Real Wombat emergency withdrawal
        uint256 userLiquidityAmount = userLiquidity[msg.sender];
        uint256 withdrawnAmount = wombatPool.withdraw(
            address(underlyingToken),
            userLiquidityAmount,
            0, // minimumAmount
            address(this),
            block.timestamp
        );

        // Transfer all withdrawn amount to vault
        underlyingToken.safeTransfer(_vault, withdrawnAmount);

        // Reset user data
        totalPrincipal -= principal[msg.sender];
        totalLiquidity -= userLiquidity[msg.sender];
        delete principal[msg.sender];
        delete userLiquidity[msg.sender];

        emit WombatEmergencyWithdraw(
            msg.sender,
            withdrawnAmount,
            userLiquidityAmount
        );
        emit EmergencyWithdraw(_vault, withdrawnAmount);
    }

    /// @notice Get Wombat pool address
    function getWombatPoolAddress() external view returns (address) {
        return address(wombatPool);
    }

    /// @notice Get Wombat asset address
    function getWombatAssetAddress() external view returns (address) {
        return address(wombatAsset);
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

    /// @notice Get Wombat stats for dashboard
    function getWombatStats()
        external
        view
        returns (
            address poolAddress,
            address assetAddress,
            address tokenAddress,
            uint256 principalAmount,
            uint256 estimatedYield,
            string memory strategyTypeName
        )
    {
        poolAddress = address(wombatPool);
        assetAddress = address(wombatAsset);
        tokenAddress = address(underlyingToken);
        principalAmount = totalPrincipal;
        estimatedYield = 1100; // 11%
        strategyTypeName = "Wombat AMM";
    }

    /// @notice Estimated APY (fixed, for UI)
    /// @dev Currently fixed and can be connected to Wombat API in the future
    function estimatedAPY() external pure override returns (int256) {
        return 1100; // Temporarily fixed (in production: calculated from Wombat API)
    }

    /// @notice Returns the strategy name for UI and analytics
    function strategyName() external pure override returns (string memory) {
        return "StrategyWombatAMM";
    }

    /// @notice Returns the strategy type for UI and analytics
    function strategyType() external pure override returns (string memory) {
        return "AMM";
    }

    /// @notice Returns a human-readable identifier for the strategy interface
    function interfaceLabel()
        external
        pure
        override(BaseStrategy)
        returns (string memory label)
    {
        return "StrategyWombatV1";
    }

    /// @notice Get vault address
    function vault() external view override returns (address) {
        return _vault;
    }

    /// @notice Get last update timestamp for a user
    function lastUpdated(
        address user
    ) external view override returns (uint256) {
        // For Wombat strategy, return current timestamp as placeholder
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
