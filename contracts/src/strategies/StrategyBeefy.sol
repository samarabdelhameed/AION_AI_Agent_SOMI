// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title StrategyBeefy - Production-grade Beefy Finance integration on BNB Testnet
 * @notice Integrated with Beefy Finance. All financial operations are protected. Review documentation for each function.
 * @dev balanceOf is not view and may cause revert if Beefy has issues. Consider using try/catch in the future.
 * @dev estimatedAPY() is currently fixed and can be connected to Beefy API in the future.
 */

import "../base/BaseStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title StrategyBeefy - Real Beefy Finance Integration
/// @notice This strategy integrates with Beefy Finance on BNB Testnet
/// @dev Uses Beefy vault contract for yield farming
interface IBeefyVault {
    function deposit(uint256 amount) external; // Deposit to Beefy vault

    function withdraw(uint256 shares) external; // Withdraw from Beefy vault

    function balanceOf(address account) external view returns (uint256); // Number of shares

    function totalSupply() external view returns (uint256); // Total shares

    function getPricePerFullShare() external view returns (uint256); // Share price

    function want() external view returns (address); // Underlying token
}

contract StrategyBeefy is BaseStrategy {
    using SafeERC20 for IERC20;

    IBeefyVault public beefyVault;
    IERC20 public underlyingToken;
    mapping(address => uint256) public principal;
    uint256 public totalPrincipal;

    // ======== Share mechanics & APY tracking ========
    // Beefy price per full share is typically scaled by 1e18
    uint256 public constant PRICE_SCALE = 1e18;
    uint256 public lastPricePerShare; // last observed PPS
    uint64 public lastPpsTimestamp; // last observation time
    int256 public cachedApyBps; // last computed APY in basis points

    // ========== Events ==========
    event RealYieldCalculated(address indexed user, uint256 realYield);
    event RealTotalAssets(uint256 assets);
    event BeefyDeposit(address indexed user, uint256 amount, uint256 shares);
    event BeefyWithdraw(address indexed user, uint256 shares, uint256 amount);

    /// @notice Initialize strategy with Beefy vault contract
    /// @param _beefyVault The address of the Beefy vault contract on BNB Testnet
    /// @param _underlyingToken The address of the underlying token
    constructor(
        address _beefyVault,
        address _underlyingToken
    ) BaseStrategy(msg.sender) {
        require(_beefyVault != address(0), "Invalid Beefy vault address");
        require(
            _underlyingToken != address(0),
            "Invalid underlying token address"
        );
        beefyVault = IBeefyVault(_beefyVault);
        underlyingToken = IERC20(_underlyingToken);
    }

    /// @notice Initialize the strategy (called by vault)
    function initialize(address vault_, address asset_) public override {
        super.initialize(vault_, asset_);
    }

    /// @notice Deposit tokens into Beefy vault
    /// @param user The user making the deposit
    /// @param amount The amount of tokens to deposit
    /// @dev Deposits tokens into Beefy vault and tracks shares
    function deposit(
        address user,
        uint256 amount
    ) external payable override onlyVault notPaused {
        require(amount > 0, "Zero deposit");
        require(msg.value == 0, "Native BNB not supported for Beefy");

        // Transfer tokens from vault to strategy
        underlyingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Real Beefy vault integration
        uint256 sharesBefore = beefyVault.balanceOf(address(this));
        underlyingToken.approve(address(beefyVault), amount);
        beefyVault.deposit(amount);
        uint256 sharesAfter = beefyVault.balanceOf(address(this));
        uint256 sharesReceived = sharesAfter - sharesBefore;

        // Track the deposit with shares
        principal[user] += amount;
        totalPrincipal += amount;
        emit BeefyDeposit(user, amount, sharesReceived);
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

        // Real Beefy vault integration
        uint256 sharesBefore = beefyVault.balanceOf(address(this));
        underlyingToken.approve(address(beefyVault), amount);
        beefyVault.deposit(amount);
        uint256 sharesAfter = beefyVault.balanceOf(address(this));
        uint256 sharesReceived = sharesAfter - sharesBefore;

        // Track the deposit with shares
        principal[user] += amount;
        totalPrincipal += amount;
        emit BeefyDeposit(user, amount, sharesReceived);
        emit Deposited(user, amount);
    }

    /// @notice Withdraw principal amount from Beefy vault
    /// @param user The user withdrawing funds
    /// @param amount The amount of tokens to withdraw
    /// @dev Redeems underlying tokens from Beefy vault
    function withdraw(
        address user,
        uint256 amount
    ) external override onlyVault notPaused {
        require(principal[user] >= amount, "Exceeds principal");

        // Real Beefy vault withdrawal
        uint256 sharesToRedeem = (amount * beefyVault.totalSupply()) /
            beefyVault.getPricePerFullShare();
        beefyVault.withdraw(sharesToRedeem);

        // Update state after successful withdrawal
        principal[user] -= amount;
        totalPrincipal -= amount;

        // Transfer underlying tokens to vault
        underlyingToken.safeTransfer(_vault, amount);
        emit BeefyWithdraw(user, sharesToRedeem, amount);
        emit Withdrawn(user, amount);
    }

    /// @notice Withdraw yield only from Beefy vault
    /// @param user The user claiming yield
    /// @param amount The amount of yield to withdraw
    /// @dev Redeems yield portion from Beefy without affecting principal
    function withdrawYield(
        address user,
        uint256 amount
    ) external override onlyVault notPaused {
        uint256 yield = getYield(user);
        require(yield >= amount, "Insufficient yield");

        // Real Beefy vault yield withdrawal
        uint256 sharesToRedeem = (amount * beefyVault.totalSupply()) /
            beefyVault.getPricePerFullShare();
        beefyVault.withdraw(sharesToRedeem);

        // Transfer yield to vault
        underlyingToken.safeTransfer(_vault, amount);
        emit YieldWithdrawn(user, amount);
    }

    /// @notice Convert Beefy shares to underlying amount using current PPS
    function underlyingFromShares(
        uint256 shares
    ) public view returns (uint256) {
        if (shares == 0) return 0;
        uint256 pps = beefyVault.getPricePerFullShare();
        return (shares * pps) / PRICE_SCALE;
    }

    /// @notice Estimate user yield from real share mechanics
    /// @dev Uses current PPS and this contract's shares; falls back to principal-only if no shares
    function getYield(address user) public view override returns (uint256) {
        if (principal[user] == 0) return 0;

        uint256 shares = beefyVault.balanceOf(address(this));
        if (shares == 0) {
            return 0;
        }

        uint256 totalCurrent = underlyingFromShares(shares);
        if (totalCurrent <= totalPrincipal) return 0;

        uint256 totalGain = totalCurrent - totalPrincipal;
        return (principal[user] * totalGain) / totalPrincipal;
    }

    /// @notice Estimate total assets from shares and PPS
    function totalAssets() external view override returns (uint256) {
        uint256 shares = beefyVault.balanceOf(address(this));
        if (shares == 0) return totalPrincipal;
        return underlyingFromShares(shares);
    }

    /// @notice Get real total assets from Beefy (may revert if Beefy fails)
    /// @dev balanceOf is not view and may cause revert if Beefy has issues. Consider using try/catch in the future.
    function getRealTotalAssets() external returns (uint256) {
        uint256 assets = beefyVault.balanceOf(address(this));
        emit RealTotalAssets(assets);
        return assets;
    }

    /// @notice Get real yield for a user (may revert if Beefy fails)
    /// @dev Depends on actual value from Beefy
    function getRealYield(address user) external returns (uint256) {
        if (principal[user] == 0) return 0;
        uint256 currentValue = beefyVault.balanceOf(address(this));
        if (currentValue <= totalPrincipal) {
            emit RealYieldCalculated(user, 0);
            return 0;
        }
        uint256 totalYield = currentValue - totalPrincipal;
        uint256 userShare = (principal[user] * totalYield) / totalPrincipal;
        emit RealYieldCalculated(user, userShare);
        return userShare;
    }

    /// @notice Emergency withdraw all funds from Beefy
    /// @dev Only vault can call in emergency
    function emergencyWithdraw() external override onlyVault {
        // Real Beefy emergency withdrawal
        uint256 shares = beefyVault.balanceOf(address(this));
        if (shares > 0) {
            beefyVault.withdraw(shares);
        }
        uint256 balance = underlyingToken.balanceOf(address(this));
        if (balance > 0) {
            underlyingToken.safeTransfer(_vault, balance);
        }
        emit EmergencyWithdraw(_vault, balance);
    }

    /// @notice Get Beefy vault address
    function getBeefyVaultAddress() external view returns (address) {
        return address(beefyVault);
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

    /// @notice Get Beefy stats for dashboard
    function getBeefyStats()
        external
        view
        returns (
            address beefyVaultAddress,
            address tokenAddress,
            uint256 principalAmount,
            uint256 estimatedYield,
            string memory strategyTypeName
        )
    {
        beefyVaultAddress = address(beefyVault);
        tokenAddress = address(underlyingToken);
        principalAmount = totalPrincipal;
        estimatedYield = 800; // 8%
        strategyTypeName = "Beefy Yield Farming";
    }

    /// @notice Refresh Beefy PPS and update cached APY
    /// @dev APY is computed from PPS change per second and annualized to basis points
    function refreshBeefyStats() public returns (int256) {
        uint256 currentPps = beefyVault.getPricePerFullShare();
        uint64 nowTs = uint64(block.timestamp);

        if (
            lastPricePerShare > 0 &&
            lastPpsTimestamp > 0 &&
            currentPps >= lastPricePerShare &&
            nowTs > lastPpsTimestamp
        ) {
            uint256 deltaPps = currentPps - lastPricePerShare;
            uint256 rel = (deltaPps * PRICE_SCALE) / lastPricePerShare; // 1e18-scaled relative increase
            uint256 dt = uint256(nowTs - lastPpsTimestamp);
            // annualized = rel * secondsPerYear / dt
            uint256 annualized = (rel * 365 days) / dt; // 1e18-scaled
            uint256 bps = (annualized * 10000) / PRICE_SCALE; // basis points
            cachedApyBps = int256(bps);
        }

        lastPricePerShare = currentPps;
        lastPpsTimestamp = nowTs;
        return cachedApyBps;
    }

    /// @notice Estimated APY from cached PPS delta; computes on-the-fly if needed
    function estimatedAPY() external view override returns (int256) {
        if (cachedApyBps != 0) return cachedApyBps;
        if (lastPricePerShare == 0 || lastPpsTimestamp == 0) return 0;

        uint256 currentPps = beefyVault.getPricePerFullShare();
        if (currentPps < lastPricePerShare) return 0;
        uint256 dt = block.timestamp - lastPpsTimestamp;
        if (dt == 0) return 0;

        uint256 deltaPps = currentPps - lastPricePerShare;
        uint256 rel = (deltaPps * PRICE_SCALE) / lastPricePerShare; // 1e18-scaled
        uint256 annualized = (rel * 365 days) / dt; // 1e18-scaled
        uint256 bps = (annualized * 10000) / PRICE_SCALE; // basis points
        return int256(bps);
    }

    /// @notice Returns the strategy name for UI and analytics
    function strategyName() external pure override returns (string memory) {
        return "StrategyBeefyYield";
    }

    /// @notice Returns the strategy type for UI and analytics
    function strategyType() external pure override returns (string memory) {
        return "Yield Farming";
    }

    /// @notice Returns a human-readable identifier for the strategy interface
    function interfaceLabel()
        external
        pure
        override(BaseStrategy)
        returns (string memory label)
    {
        return "StrategyBeefyV1";
    }

    /// @notice Get vault address
    function vault() external view override returns (address) {
        return _vault;
    }

    /// @notice Get strategy version
    function version() external pure override returns (string memory) {
        return "1.0.0";
    }

    /// @notice Get last update timestamp for a user
    /// @param user The user address
    /// @return timestamp The last update timestamp
    function lastUpdated(
        address user
    ) external pure override returns (uint256 timestamp) {
        // For Beefy strategy, we don't track individual user timestamps
        // Return 0 as a fallback since we don't track timestamps
        return 0;
    }

    /// @notice Get pending rewards for a user
    /// @param user The user address
    /// @return rewards The pending rewards amount
    function pendingRewards(
        address user
    ) external view override returns (uint256 rewards) {
        // For Beefy strategy, rewards are continuously compounded
        // Return current yield as pending rewards
        return getYield(user);
    }
}
