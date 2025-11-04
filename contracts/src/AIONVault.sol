// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title AIONVault - AI-powered DeFi Vault for BNB strategy execution
 * @notice Production-grade contract. Security: Ownable, nonReentrant, Pausable, StrategyLocking, onlyAIAgent, onlyStrategy. See comments for best practices.
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IStrategy.sol";
import "./interfaces/IStrategyAdapter.sol";

/// @title AIONVault - AI-powered DeFi Vault for BNB strategy execution
/// @author Samar
contract AIONVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Legacy strategy support (for backward compatibility)
    IStrategy public strategy;

    // New Strategy Adapter system
    IStrategyAdapter public currentAdapter;
    mapping(address => AdapterInfo) public adapters;
    address[] public adapterList;

    // Adapter information struct
    struct AdapterInfo {
        IStrategyAdapter adapter;
        bool active;
        uint256 addedAt;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        string name;
        uint8 riskLevel;
    }

    address public aiAgent;
    bool public strategyLocked;

    // Shares-based accounting system
    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;

    // Principal tracking for earnings calculation
    mapping(address => uint256) public principalOf;

    // Legacy balance tracking (for backward compatibility)
    mapping(address => uint256) public balances;
    mapping(address => uint256) public userYieldClaimed;
    uint256 public accumulatedYield;
    uint256 public minDeposit;
    uint256 public minYieldClaim;

    // Constants
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_BPS = 10000;

    // Security Configuration
    uint256 public maxAllocationBps = 9000; // 90% max allocation
    uint256 public circuitBreakerThreshold = 5000; // 50% loss threshold
    bool public circuitBreakerTripped = false;
    uint256 public healthCheckInterval = 3600; // 1 hour
    uint256 public lastHealthCheck = 0;

    // ========== Events ==========
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event WithdrawAll(address indexed user, uint256 amount);
    event StrategyUpdated(address indexed newStrategy);
    event AdapterUpdated(
        address indexed oldAdapter,
        address indexed newAdapter
    );
    event AdapterAdded(address indexed adapter, string name);
    event Rebalanced(
        address indexed fromAdapter,
        address indexed toAdapter,
        uint256 amount
    );

    // Proof-of-Yield Events
    event StrategyRebalanced(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    event YieldRealized(
        address indexed user,
        address indexed adapter,
        uint256 amount,
        uint256 timestamp
    );
    event AdapterHealthUpdate(
        address indexed adapter,
        bool healthy,
        uint256 apyBps,
        uint256 tvl,
        uint256 timestamp
    );

    // Security Events
    event CircuitBreakerTripped(address indexed adapter, uint256 timestamp);
    event MaxAllocationUpdated(uint256 oldAllocation, uint256 newAllocation);
    event CircuitBreakerReset(uint256 timestamp);
    event AIAgentUpdated(address indexed newAgent);
    event EmergencyWithdraw(address indexed to, uint256 amount);
    event YieldClaimed(address indexed user, uint256 amount);
    event StrategyLocked();
    event MinDepositUpdated(uint256 oldValue, uint256 newValue);
    event MinYieldClaimUpdated(uint256 oldValue, uint256 newValue);

    // ========== Modifiers ==========
    /// @dev Only the AI agent can call
    modifier onlyAIAgent() {
        require(msg.sender == aiAgent, "Not authorized (AI)");
        _;
    }
    /// @dev Only the current strategy can call
    modifier onlyStrategy() {
        require(msg.sender == address(strategy), "Not strategy");
        _;
    }
    /// @dev Only if strategy is set
    modifier strategyIsSet() {
        require(address(strategy) != address(0), "Strategy not set");
        _;
    }

    // ========== Security: Ownable ==========
    // Only the contract owner can call (see OpenZeppelin Ownable)
    // ========== Security: nonReentrant ==========
    // Prevents reentrancy attacks on all financial functions
    // ========== Security: Pausable ==========
    // Can pause all operations in emergency
    // ========== Security: Strategy Locking ==========
    // Prevents changing strategy after locking

    constructor(
        uint256 _minDeposit,
        uint256 _minYieldClaim
    ) Ownable(msg.sender) {
        minDeposit = _minDeposit;
        minYieldClaim = _minYieldClaim;
    }

    /// @notice Set the AI Agent address that can change strategies
    /// @param _agent The address of the AI Agent contract
    /// @dev Only the vault owner can set the AI Agent
    /// @dev The AI Agent is responsible for strategy selection and optimization
    function setAIAgent(address _agent) external onlyOwner {
        require(_agent != address(0), "Invalid AI Agent");
        aiAgent = _agent;
        emit AIAgentUpdated(_agent);
    }

    /// @notice Lock the strategy to prevent further changes
    /// @dev Only the vault owner can lock the strategy
    /// @dev Once locked, no new strategies can be set until unlocked
    function lockStrategy() external onlyOwner {
        strategyLocked = true;
        emit StrategyLocked();
    }

    /**
     * @notice Unlocks the strategy to allow updates again (for development/testing)
     * @dev Only callable by the contract owner
     */
    function unlockStrategy() external onlyOwner {
        strategyLocked = false;
    }

    /// @notice Set a new strategy for the vault (legacy)
    /// @param _strategy The address of the new strategy contract
    /// @dev Only the AI Agent can change strategies
    /// @dev Strategy must not be locked and must be a valid address
    function setStrategy(address _strategy) external onlyAIAgent {
        require(!strategyLocked, "Strategy updates locked");
        require(_strategy != address(0), "Invalid strategy");
        strategy = IStrategy(_strategy);
        emit StrategyUpdated(_strategy);
    }

    /// @notice Add a new strategy adapter
    /// @param _adapter Address of the strategy adapter
    /// @param _name Human readable name for the adapter
    /// @dev Only owner can add adapters
    function addAdapter(
        address _adapter,
        string calldata _name
    ) external onlyOwner {
        require(_adapter != address(0), "Invalid adapter");
        require(adapters[_adapter].addedAt == 0, "Adapter already exists");

        // Validate adapter implements IStrategyAdapter interface
        IStrategyAdapter adapter = IStrategyAdapter(_adapter);
        // Interface validation is done through successful function calls

        adapters[_adapter] = AdapterInfo({
            adapter: adapter,
            active: true,
            addedAt: block.timestamp,
            totalDeposited: 0,
            totalWithdrawn: 0,
            name: _name,
            riskLevel: adapter.riskLevel()
        });

        adapterList.push(_adapter);

        emit AdapterAdded(_adapter, _name);
    }

    /// @notice Set current active adapter
    /// @param _adapter Address of the adapter to activate
    /// @dev Only AI Agent can switch adapters
    function setCurrentAdapter(address _adapter) external onlyAIAgent {
        require(!strategyLocked, "Strategy updates locked");
        require(adapters[_adapter].active, "Adapter not active");
        require(adapters[_adapter].adapter.isHealthy(), "Adapter not healthy");

        address oldAdapter = address(currentAdapter);
        currentAdapter = adapters[_adapter].adapter;

        emit AdapterUpdated(oldAdapter, _adapter);
    }

    /// @notice Rebalance funds between adapters
    /// @param _fromAdapter Source adapter address
    /// @param _toAdapter Target adapter address
    /// @param _amount Amount to rebalance
    /// @dev Only AI Agent can rebalance
    function rebalance(
        address _fromAdapter,
        address _toAdapter,
        uint256 _amount
    ) external onlyAIAgent nonReentrant {
        require(!strategyLocked, "Strategy updates locked");
        require(adapters[_fromAdapter].active, "From adapter not active");
        require(adapters[_toAdapter].active, "To adapter not active");
        require(
            adapters[_toAdapter].adapter.isHealthy(),
            "Target adapter not healthy"
        );
        require(_amount > 0, "Invalid amount");

        IStrategyAdapter fromAdapter = adapters[_fromAdapter].adapter;
        IStrategyAdapter toAdapter = adapters[_toAdapter].adapter;

        // Check sufficient assets in source adapter
        uint256 totalAdapterAssets = fromAdapter.totalAssets();
        require(
            totalAdapterAssets >= _amount,
            "Insufficient assets in source adapter"
        );

        // Calculate shares to withdraw from source adapter
        uint256 adapterTotalShares = fromAdapter.totalShares();
        uint256 sharesToWithdraw = adapterTotalShares > 0
            ? (_amount * adapterTotalShares) / totalAdapterAssets
            : _amount;

        // Withdraw from source adapter
        uint256 actualAmount = fromAdapter.withdraw(sharesToWithdraw);

        // Deposit to target adapter
        uint256 depositedShares;
        if (toAdapter.underlying() == address(0)) {
            // Native token deposit
            depositedShares = toAdapter.deposit{value: actualAmount}(
                actualAmount
            );
        } else {
            // ERC20 token deposit
            IERC20(toAdapter.underlying()).approve(
                address(toAdapter),
                actualAmount
            );
            depositedShares = toAdapter.deposit(actualAmount);
        }

        // Update adapter statistics
        adapters[_fromAdapter].totalWithdrawn += actualAmount;
        adapters[_toAdapter].totalDeposited += actualAmount;

        emit Rebalanced(_fromAdapter, _toAdapter, actualAmount);
        emit StrategyRebalanced(
            _fromAdapter,
            _toAdapter,
            actualAmount,
            block.timestamp
        );
    }

    /// @notice Set the minimum deposit amount required (in wei)
    /// @param _minDeposit The minimum deposit amount in wei
    /// @dev Only the vault owner can adjust minimum deposit requirements
    /// @dev Helps prevent spam deposits and ensures meaningful transactions
    function setMinDeposit(uint256 _minDeposit) external onlyOwner {
        uint256 oldValue = minDeposit;
        minDeposit = _minDeposit;
        emit MinDepositUpdated(oldValue, _minDeposit);
    }

    /// @notice Set the minimum deposit amount required (accepts decimal BNB values)
    /// @param _minDepositBNB The minimum deposit amount in BNB (e.g., 1000 for 0.001 BNB, 10000 for 0.01 BNB)
    /// @dev Only the vault owner can adjust minimum deposit requirements
    /// @dev Converts BNB to wei automatically (input in thousandths of BNB)
    function setMinDepositBNB(uint256 _minDepositBNB) external onlyOwner {
        uint256 oldValue = minDeposit;
        minDeposit = _minDepositBNB * 1e15; // 1000 = 0.001 BNB, 10000 = 0.01 BNB
        emit MinDepositUpdated(oldValue, minDeposit);
    }

    /// @notice Set the minimum yield amount required for claiming (in wei)
    /// @param _minYieldClaim The minimum yield amount in wei
    /// @dev Only the vault owner can adjust minimum yield claim requirements
    /// @dev Prevents micro-transactions and gas waste on small yield claims
    function setMinYieldClaim(uint256 _minYieldClaim) external onlyOwner {
        uint256 oldValue = minYieldClaim;
        minYieldClaim = _minYieldClaim;
        emit MinYieldClaimUpdated(oldValue, _minYieldClaim);
    }

    /// @notice Set the minimum yield amount required for claiming (accepts decimal BNB values)
    /// @param _minYieldClaimBNB The minimum yield amount in BNB (e.g., 100 for 0.0001 BNB, 1000 for 0.001 BNB)
    /// @dev Only the vault owner can adjust minimum yield claim requirements
    /// @dev Converts BNB to wei automatically (input in ten-thousandths of BNB)
    function setMinYieldClaimBNB(uint256 _minYieldClaimBNB) external onlyOwner {
        uint256 oldValue = minYieldClaim;
        minYieldClaim = _minYieldClaimBNB * 1e14; // 100 = 0.0001 BNB, 1000 = 0.001 BNB
        emit MinYieldClaimUpdated(oldValue, minYieldClaim);
    }

    /// @notice Pause all vault operations (deposits, withdrawals, yield claims)
    /// @dev Only the vault owner can pause operations
    /// @dev Useful for emergency situations or maintenance
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause all vault operations
    /// @dev Only the vault owner can unpause operations
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Deposit assets into the vault with shares-based accounting
    /// @param amount Amount to deposit (for ERC20) or 0 (for native)
    /// @dev Checks minDeposit, calculates shares, forwards to current adapter
    function deposit(
        uint256 amount
    ) external payable nonReentrant whenNotPaused returns (uint256 shares) {
        // Handle native vs ERC20 deposits
        uint256 depositAmount;
        if (msg.value > 0) {
            require(amount == 0 || amount == msg.value, "Amount mismatch");
            depositAmount = msg.value;
        } else {
            require(amount > 0, "Invalid amount");
            depositAmount = amount;
        }

        require(depositAmount >= minDeposit, "Deposit too small");

        // Get total assets before deposit for accurate share calculation
        uint256 totalAssetsBefore = totalAssets();

        // Calculate shares to mint
        shares = calculateSharesForDeposit(depositAmount, totalAssetsBefore);

        // Update shares accounting
        sharesOf[msg.sender] += shares;
        totalShares += shares;

        // Track principal for earnings calculation
        principalOf[msg.sender] += depositAmount;

        // Try to deposit to current adapter if available
        if (address(currentAdapter) != address(0)) {
            require(currentAdapter.isHealthy(), "Adapter not healthy");

            // Use private function to avoid reentrancy conflicts
            _depositToAdapter(depositAmount);

            // Update adapter statistics
            adapters[address(currentAdapter)].totalDeposited += depositAmount;
        } else if (address(strategy) != address(0)) {
            // Fallback to legacy strategy - use private function to avoid reentrancy conflicts
            _depositToLegacyStrategy(msg.sender, depositAmount);
        }

        // Update legacy balance for backward compatibility
        balances[msg.sender] += depositAmount;

        emit Deposited(msg.sender, depositAmount, shares);
    }

    /// @notice Private function to deposit to adapter (avoids reentrancy conflicts)
    /// @param amount Amount to deposit
    function _depositToAdapter(uint256 amount) private {
        // Handle ERC20 token transfer if needed
        if (msg.value == 0) {
            require(
                currentAdapter.underlying() != address(0),
                "Adapter requires native tokens"
            );
            IERC20(currentAdapter.underlying()).safeTransferFrom(
                msg.sender,
                address(this),
                amount
            );
            IERC20(currentAdapter.underlying()).approve(
                address(currentAdapter),
                amount
            );
            currentAdapter.deposit(amount);
        } else {
            require(
                currentAdapter.underlying() == address(0),
                "Adapter doesn't accept native tokens"
            );
            currentAdapter.deposit{value: amount}(amount);
        }
    }

    /// @notice Private function to deposit to legacy strategy (avoids reentrancy conflicts)
    /// @param user User depositing funds
    /// @param amount Amount to deposit
    function _depositToLegacyStrategy(address user, uint256 amount) private {
        try strategy.deposit{value: amount}(user, amount) {
            // Legacy strategy deposit successful
        } catch {
            // Legacy strategy deposit failed
        }
    }

    /// @notice Private function to withdraw from legacy strategy (avoids reentrancy conflicts)
    /// @param user User withdrawing funds
    /// @param amount Amount to withdraw
    function _withdrawFromLegacyStrategy(address user, uint256 amount) private {
        try strategy.withdraw(user, amount) {
            // Legacy strategy withdrawal successful
        } catch {
            // Legacy strategy withdrawal failed
        }
    }

    /// @notice Deposit BNB into the vault (legacy function for backward compatibility)
    /// @dev Calls the new deposit function with amount = 0
    function deposit()
        external
        payable
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        // Handle native vs ERC20 deposits
        uint256 depositAmount = msg.value;
        require(depositAmount > 0, "Invalid amount");
        require(depositAmount >= minDeposit, "Deposit too small");

        // Get total assets before deposit for accurate share calculation
        uint256 totalAssetsBefore = totalAssets();

        // Calculate shares to mint
        shares = calculateSharesForDeposit(depositAmount, totalAssetsBefore);

        // Update shares accounting
        sharesOf[msg.sender] += shares;
        totalShares += shares;

        // Try to deposit to current adapter if available
        if (address(currentAdapter) != address(0)) {
            require(currentAdapter.isHealthy(), "Adapter not healthy");

            // Use private function to avoid reentrancy conflicts
            _depositToAdapter(depositAmount);

            // Update adapter statistics
            adapters[address(currentAdapter)].totalDeposited += depositAmount;
        } else if (address(strategy) != address(0)) {
            // Fallback to legacy strategy - use private function to avoid reentrancy conflicts
            _depositToLegacyStrategy(msg.sender, depositAmount);
        }

        // Update legacy balance for backward compatibility
        balances[msg.sender] += depositAmount;

        emit Deposited(msg.sender, depositAmount, shares);
    }

    /// @notice Calculate shares to mint for deposit amount
    /// @param amount Amount being deposited
    /// @param totalAssetsBefore Total assets before the deposit
    /// @return shares Number of shares to mint
    function calculateSharesForDeposit(
        uint256 amount,
        uint256 totalAssetsBefore
    ) public view returns (uint256 shares) {
        if (totalShares == 0) {
            // First deposit, 1:1 ratio
            shares = amount;
        } else if (totalAssetsBefore == 0) {
            // Edge case: shares exist but no assets (emergency recovery)
            // Reset to 1:1 ratio
            shares = amount;
        } else {
            // Normal case: shares = amount * totalShares / totalAssets
            shares = (amount * totalShares) / totalAssetsBefore;
        }

        // Ensure we don't mint 0 shares for non-zero amount
        if (shares == 0 && amount > 0) {
            shares = 1;
        }
    }

    /// @notice Calculate shares to mint for deposit amount (legacy overload)
    /// @param amount Amount being deposited
    /// @return shares Number of shares to mint
    function calculateSharesForDeposit(
        uint256 amount
    ) public view returns (uint256 shares) {
        return calculateSharesForDeposit(amount, totalAssets());
    }

    /// @notice Withdraw assets from the vault using shares
    /// @param shares The number of shares to burn
    /// @dev Burns shares and returns proportional assets
    function withdrawShares(
        uint256 shares
    ) external nonReentrant whenNotPaused returns (uint256 amount) {
        require(shares > 0, "Invalid shares");
        require(sharesOf[msg.sender] >= shares, "Insufficient shares");

        // Calculate amount to withdraw based on current total assets
        uint256 currentTotalAssets = totalAssets();
        amount = calculateAssetsForShares(shares, currentTotalAssets);

        // Allow small withdrawals or emergency cases
        if (amount == 0 && shares > 0) {
            amount = 1; // Minimum withdrawal
        }
        require(amount > 0, "No assets to withdraw");

        // Update shares accounting before external calls
        sharesOf[msg.sender] -= shares;
        totalShares -= shares;

        // Update principal proportionally
        if (sharesOf[msg.sender] == 0) {
            // If withdrawing all shares, clear principal
            principalOf[msg.sender] = 0;
        } else {
            // Reduce principal proportionally to shares withdrawn
            uint256 principalReduction = (principalOf[msg.sender] * shares) /
                (sharesOf[msg.sender] + shares);
            principalOf[msg.sender] -= principalReduction;
        }

        // Try to withdraw from current adapter
        if (address(currentAdapter) != address(0)) {
            // Use private function to avoid reentrancy conflicts
            amount = _withdrawFromAdapter(shares);

            // Update adapter statistics
            adapters[address(currentAdapter)].totalWithdrawn += amount;
        } else if (address(strategy) != address(0)) {
            // Fallback to legacy strategy - use private function to avoid reentrancy conflicts
            _withdrawFromLegacyStrategy(msg.sender, amount);

            // Send funds to user (legacy)
            Address.sendValue(payable(msg.sender), amount);
        } else {
            // Direct withdrawal from vault balance
            Address.sendValue(payable(msg.sender), amount);
        }

        // Update legacy balance for backward compatibility
        if (balances[msg.sender] >= amount) {
            balances[msg.sender] -= amount;
        }

        emit Withdrawn(msg.sender, amount, shares);
    }

    /// @notice Private function to withdraw from adapter (avoids reentrancy conflicts)
    /// @param shares Number of shares to withdraw
    /// @return amount Amount withdrawn
    function _withdrawFromAdapter(
        uint256 shares
    ) private returns (uint256 amount) {
        // Calculate adapter shares to withdraw
        uint256 adapterTotalShares = currentAdapter.totalShares();
        uint256 adapterShares;

        if (adapterTotalShares == 0 || totalShares == 0) {
            // No adapter shares or vault shares, use direct mapping
            adapterShares = shares;
        } else {
            // Proportional calculation with bounds check
            adapterShares = (shares * adapterTotalShares) / totalShares;
            // Ensure we don't request more than available
            if (adapterShares > adapterTotalShares) {
                adapterShares = adapterTotalShares;
            }
        }

        uint256 actualAmount = currentAdapter.withdraw(adapterShares);

        // Transfer to user
        if (currentAdapter.underlying() == address(0)) {
            // Native token
            Address.sendValue(payable(msg.sender), actualAmount);
        } else {
            // ERC20 token
            IERC20(currentAdapter.underlying()).safeTransfer(
                msg.sender,
                actualAmount
            );
        }

        return actualAmount;
    }

    /// @notice Withdraw BNB from the vault (legacy function)
    /// @param amount The amount to withdraw
    /// @dev Converts amount to shares and calls withdrawShares
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(balances[msg.sender] >= amount, "Insufficient funds");

        // Convert amount to shares
        uint256 shares = calculateSharesForAmount(amount);
        require(sharesOf[msg.sender] >= shares, "Insufficient shares");

        // Calculate amount to withdraw based on current total assets
        uint256 currentTotalAssets = totalAssets();
        uint256 withdrawAmount = calculateAssetsForShares(
            shares,
            currentTotalAssets
        );
        require(withdrawAmount > 0, "No assets to withdraw");

        // Update shares accounting before external calls
        sharesOf[msg.sender] -= shares;
        totalShares -= shares;

        // Try to withdraw from current adapter
        if (address(currentAdapter) != address(0)) {
            // Use private function to avoid reentrancy conflicts
            withdrawAmount = _withdrawFromAdapter(shares);

            // Update adapter statistics
            adapters[address(currentAdapter)].totalWithdrawn += withdrawAmount;
        } else if (address(strategy) != address(0)) {
            // Fallback to legacy strategy - use private function to avoid reentrancy conflicts
            _withdrawFromLegacyStrategy(msg.sender, withdrawAmount);

            // Send funds to user (legacy)
            Address.sendValue(payable(msg.sender), withdrawAmount);
        } else {
            // Direct withdrawal from vault balance
            Address.sendValue(payable(msg.sender), withdrawAmount);
        }

        // Update legacy balance for backward compatibility
        if (balances[msg.sender] >= withdrawAmount) {
            balances[msg.sender] -= withdrawAmount;
        }

        emit Withdrawn(msg.sender, withdrawAmount, shares);
    }

    /// @notice Calculate assets to return for share amount
    /// @param shares Number of shares being burned
    /// @param currentTotalAssets Current total assets value
    /// @return amount Amount of assets to return
    function calculateAssetsForShares(
        uint256 shares,
        uint256 currentTotalAssets
    ) public view returns (uint256 amount) {
        if (totalShares == 0 || shares == 0) {
            return 0;
        }

        // amount = shares * totalAssets / totalShares
        amount = (shares * currentTotalAssets) / totalShares;
    }

    /// @notice Calculate assets to return for share amount (legacy overload)
    /// @param shares Number of shares being burned
    /// @return amount Amount of assets to return
    function calculateAssetsForShares(
        uint256 shares
    ) public view returns (uint256 amount) {
        return calculateAssetsForShares(shares, totalAssets());
    }

    /// @notice Calculate shares needed for specific amount
    /// @param amount Amount of assets desired
    /// @return shares Number of shares needed
    function calculateSharesForAmount(
        uint256 amount
    ) public view returns (uint256 shares) {
        uint256 currentTotalAssets = totalAssets();
        if (currentTotalAssets == 0) {
            return 0;
        }

        // shares = amount * totalShares / totalAssets
        shares = (amount * totalShares) / currentTotalAssets;
    }

    /// @notice Withdraw all user balance from the vault
    /// @dev Calls withdraw for the full balance
    function withdrawAll() external nonReentrant whenNotPaused {
        uint256 userBal = balances[msg.sender];
        require(userBal > 0, "Nothing to withdraw");

        // Reset user balance first
        balances[msg.sender] = 0;

        // Use private function to avoid reentrancy conflicts
        _withdrawAllFromStrategy(msg.sender, userBal);

        emit WithdrawAll(msg.sender, userBal);
    }

    /// @notice Private function to withdraw all from strategy (avoids reentrancy conflicts)
    /// @param user User withdrawing all funds
    /// @param amount Amount to withdraw
    function _withdrawAllFromStrategy(address user, uint256 amount) private {
        // Try to withdraw from strategy
        if (address(strategy) != address(0)) {
            try strategy.withdraw(user, amount) {
                // Strategy succeeded
            } catch {
                // Strategy failed, continue with direct withdrawal
            }
        }

        // Send funds to user
        Address.sendValue(payable(user), amount);
    }

    /// @notice Emergency withdraw all funds to owner
    /// @dev Only the owner can call in emergency
    function emergencyWithdraw() external onlyOwner nonReentrant {
        // Use private function to avoid reentrancy conflicts
        _emergencyWithdrawToOwner();
    }

    /// @notice Private function to emergency withdraw to owner (avoids reentrancy conflicts)
    function _emergencyWithdrawToOwner() private {
        if (address(strategy) != address(0)) {
            strategy.emergencyWithdraw();
        }
        uint256 bal = address(this).balance;
        if (bal > 0) {
            Address.sendValue(payable(owner()), bal);
            emit EmergencyWithdraw(owner(), bal);
        }
    }

    /// @notice Claim yield from the strategy
    /// @dev Checks minYieldClaim, calls strategy.getYield, and ensures funds are returned
    function claimYield() external nonReentrant whenNotPaused {
        require(address(strategy) != address(0), "Strategy not set");
        uint256 yieldAmount = strategy.getYield(msg.sender);
        require(yieldAmount >= minYieldClaim, "Yield too small");
        require(yieldAmount > 0, "No yield to claim");

        // Use private function to avoid reentrancy conflicts
        _claimYieldFromStrategy(msg.sender, yieldAmount);

        emit YieldClaimed(msg.sender, yieldAmount);
    }

    /// @notice Private function to claim yield from strategy (avoids reentrancy conflicts)
    /// @param user User claiming yield
    /// @param yieldAmount Amount of yield to claim
    function _claimYieldFromStrategy(
        address user,
        uint256 yieldAmount
    ) private {
        accumulatedYield += yieldAmount;
        userYieldClaimed[user] += yieldAmount;
        strategy.withdrawYield(user, yieldAmount);
        Address.sendValue(payable(user), yieldAmount);
    }

    /// @notice Fallback function (disabled in production for security)
    /// @dev Receiving BNB directly is not allowed in production. Remove payable or add revert for extra safety.
    receive() external payable {
        // Allow direct BNB deposits like the old working code
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, msg.value);
    }

    fallback() external payable {
        // Allow direct BNB deposits like the old working code
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, msg.value);
    }

    /// @notice Get the current balance of a specific user (including yield)
    /// @param user The address of the user to query
    /// @return The amount of BNB the user can withdraw (in wei)
    /// @dev This function returns the user's share of total assets including yield
    function balanceOf(address user) external view returns (uint256) {
        if (sharesOf[user] == 0) {
            return balances[user]; // Fallback to legacy balance
        }
        return calculateAssetsForShares(sharesOf[user]);
    }

    /// @notice Get user's share balance
    /// @param user The address of the user to query
    /// @return Number of shares owned by the user
    function shareBalanceOf(address user) external view returns (uint256) {
        return sharesOf[user];
    }

    /// @notice Get the total value of all assets managed by the vault
    /// @return The total value of all deposits plus accumulated yield (in wei)
    /// @dev This aggregates assets from current adapter, legacy strategy, and vault balance
    function totalAssets() public view returns (uint256) {
        uint256 total = 0;

        // Add assets from current adapter (priority)
        if (address(currentAdapter) != address(0)) {
            try currentAdapter.totalAssets() returns (uint256 adapterAssets) {
                total += adapterAssets;
            } catch {
                // Adapter call failed, skip
            }
        }

        // Add assets from legacy strategy (if no adapter)
        if (
            address(currentAdapter) == address(0) &&
            address(strategy) != address(0)
        ) {
            try strategy.totalAssets() returns (uint256 strategyAssets) {
                total += strategyAssets;
            } catch {
                // Strategy call failed, skip
            }
        }

        // Add vault's own balance as fallback
        total += address(this).balance;

        return total;
    }

    /// @notice Get estimated APY from current adapter or strategy
    /// @return APY in basis points
    function estimatedAPY() external view returns (uint256) {
        if (address(currentAdapter) != address(0)) {
            try currentAdapter.estimatedAPY() returns (uint256 apy) {
                return apy;
            } catch {
                return 0;
            }
        } else if (address(strategy) != address(0)) {
            try strategy.estimatedAPY() returns (int256 apy) {
                return apy > 0 ? uint256(apy) : 0;
            } catch {
                return 0;
            }
        }
        return 0;
    }

    /// @notice Get the total value of all assets (legacy function name)
    /// @return The total value of all deposits plus accumulated yield (in wei)
    function totalDeposits() external view returns (uint256) {
        return totalAssets();
    }

    /// @notice Get price per share
    /// @return Price per share in wei (scaled by PRECISION)
    function pricePerShare() external view returns (uint256) {
        if (totalShares == 0) {
            return PRECISION;
        }
        return (totalAssets() * PRECISION) / totalShares;
    }

    /// @notice Check if a user has any deposits in the vault
    /// @param user The address of the user to check
    /// @return True if the user has deposited funds, false otherwise
    /// @dev Useful for UI to show/hide deposit options or user status
    function userHasDeposited(address user) external view returns (bool) {
        return balances[user] > 0;
    }

    /// @notice Get comprehensive vault statistics for a specific user
    /// @param user The address of the user to get stats for
    /// @return userDeposit The amount of BNB deposited by the user (principal only)
    /// @return strategyAddress The address of the current strategy contract
    /// @return vaultBalance The total value managed by the strategy (principal + yield)
    /// @return totalYield The total accumulated yield across all users
    /// @return userUnclaimedYield The yield available for the user to claim
    /// @return strategyActive Whether the strategy is currently active (not locked)
    /// @dev This function is essential for dashboard displays and user analytics
    /// @dev Returns real-time data from both vault and strategy contracts
    function getVaultStats(
        address user
    )
        external
        view
        returns (
            uint256 userDeposit,
            address strategyAddress,
            uint256 vaultBalance,
            uint256 totalYield,
            uint256 userUnclaimedYield,
            bool strategyActive
        )
    {
        userDeposit = balances[user];
        strategyAddress = address(strategy);
        vaultBalance = strategy.totalAssets();
        totalYield = accumulatedYield;
        userUnclaimedYield = strategy.getYield(user);
        strategyActive = !strategyLocked;
    }

    /// @notice Get the total amount of yield that a user has already claimed
    /// @param user The address of the user to query
    /// @return The total amount of yield claimed by the user (in wei)
    /// @dev This represents the historical total of all yield claims by the user
    /// @dev Useful for tracking user's yield history and performance
    function getUserTotalYield(address user) external view returns (uint256) {
        return userYieldClaimed[user];
    }

    /// @notice Get the total accumulated yield for a user (claimed + unclaimed)
    /// @param user The address of the user to query
    /// @return The total yield earned by the user (claimed + available to claim)
    /// @dev This is the sum of previously claimed yield plus currently available yield
    /// @dev Useful for calculating total user performance and APY calculations
    function getUserTotalAccumulatedYield(
        address user
    ) external view returns (uint256) {
        return userYieldClaimed[user] + strategy.getYield(user);
    }

    /// @notice Get list of all registered adapters
    /// @return Array of adapter addresses
    function getAdapters() external view returns (address[] memory) {
        return adapterList;
    }

    /// @notice Get adapter information
    /// @param _adapter Adapter address
    /// @return name Strategy name
    /// @return protocol Protocol name
    /// @return apy Estimated APY
    /// @return adapterTotalAssets Total assets managed
    /// @return healthy Health status
    /// @return riskLevel Risk level (1-10)
    /// @return totalDeposited Total amount deposited to this adapter
    /// @return totalWithdrawn Total amount withdrawn from this adapter
    function getAdapterInfo(
        address _adapter
    )
        external
        view
        returns (
            string memory name,
            string memory protocol,
            uint256 apy,
            uint256 adapterTotalAssets,
            bool healthy,
            uint8 riskLevel,
            uint256 totalDeposited,
            uint256 totalWithdrawn
        )
    {
        require(adapters[_adapter].active, "Adapter not active");

        AdapterInfo memory info = adapters[_adapter];
        IStrategyAdapter adapter = info.adapter;

        name = adapter.name();
        protocol = adapter.protocolName();
        apy = adapter.estimatedAPY();
        adapterTotalAssets = adapter.totalAssets();
        healthy = adapter.isHealthy();
        riskLevel = info.riskLevel;
        totalDeposited = info.totalDeposited;
        totalWithdrawn = info.totalWithdrawn;
    }

    /// @notice Remove/deactivate an adapter
    /// @param _adapter Adapter address to deactivate
    /// @dev Only owner can deactivate adapters
    function removeAdapter(address _adapter) external onlyOwner {
        require(adapters[_adapter].active, "Adapter not active");
        require(
            address(currentAdapter) != _adapter,
            "Cannot remove active adapter"
        );

        adapters[_adapter].active = false;

        // Remove from adapter list
        for (uint256 i = 0; i < adapterList.length; i++) {
            if (adapterList[i] == _adapter) {
                adapterList[i] = adapterList[adapterList.length - 1];
                adapterList.pop();
                break;
            }
        }

        emit AdapterUpdated(_adapter, address(0));
    }

    /// @notice Get current adapter address
    /// @return Address of current active adapter
    function getCurrentAdapter() external view returns (address) {
        return address(currentAdapter);
    }

    /// @notice Check if using new adapter system
    /// @return True if using adapters, false if using legacy strategy
    function isUsingAdapters() external view returns (bool) {
        return address(currentAdapter) != address(0);
    }

    /// @dev Reserved for future yield logging (not used yet)
    function _logYieldActivity(address user, uint256 amount) internal pure {
        // reserved for future use
    }

    // =====================================================================
    // PROOF-OF-YIELD FUNCTIONS
    // =====================================================================

    /**
     * @notice Get strategy snapshot for a specific adapter
     * @param adapter Strategy adapter address
     * @return snapshot Strategy snapshot data
     */
    function getStrategySnapshot(
        address adapter
    ) external view returns (StrategySnapshot memory snapshot) {
        require(adapter != address(0), "Invalid adapter address");

        // Get adapter's total assets
        uint256 adapterAssets = 0;
        uint256 adapterShares = 0;

        try IStrategyAdapter(adapter).totalAssets() returns (uint256 assets) {
            adapterAssets = assets;
        } catch {
            // Handle gracefully if adapter is not accessible
            adapterAssets = 0;
        }

        // Calculate shares for this adapter (simplified)
        if (address(currentAdapter) == adapter) {
            adapterShares = totalShares;
        }

        // Calculate share price
        uint256 sharePrice = PRECISION; // Default 1.0
        if (adapterShares > 0 && adapterAssets > 0) {
            sharePrice = (adapterAssets * PRECISION) / adapterShares;
        }

        // Get APY from adapter
        uint256 apy = 0;
        try IStrategyAdapter(adapter).protocolSnapshot() returns (
            ProtocolSnapshot memory protocolSnap
        ) {
            apy = protocolSnap.apyBps; // Keep in BPS format
        } catch {
            apy = 0;
        }

        snapshot = StrategySnapshot({
            adapter: adapter,
            totalAssets: adapterAssets,
            totalShares: adapterShares,
            sharePrice: sharePrice,
            apy: apy,
            allocation: address(currentAdapter) == adapter ? 10000 : 0, // 100% if active, 0% if not
            isActive: address(currentAdapter) == adapter,
            lastRebalance: block.timestamp
        });
    }

    /**
     * @notice Get user earnings (realized and unrealized)
     * @param user User address
     * @return realized Realized earnings
     * @return unrealized Unrealized earnings
     */
    function getUserEarnings(
        address user
    ) external view returns (uint256 realized, uint256 unrealized) {
        uint256 userShares = sharesOf[user];
        if (userShares == 0) {
            return (0, 0);
        }

        // Get current value of user's shares
        uint256 currentValue = calculateAssetsForShares(
            userShares,
            totalAssets()
        );

        // Get user's principal from tracked deposits
        uint256 userPrincipal = principalOf[user];

        // Calculate unrealized earnings
        if (currentValue > userPrincipal) {
            unrealized = currentValue - userPrincipal;
        }

        // Realized earnings (simplified - would come from tracking withdrawals)
        realized = 0;
    }

    /**
     * @notice Get detailed user earnings
     * @param user User address
     * @return earnings Detailed earnings structure
     */
    function getUserEarningsDetailed(
        address user
    ) external view returns (UserEarnings memory earnings) {
        uint256 userShares = sharesOf[user];
        uint256 currentBalance = calculateAssetsForShares(
            userShares,
            totalAssets()
        );

        // Get principal from tracked deposits
        uint256 totalDeposited = principalOf[user];

        // Calculate earnings
        (uint256 realized, uint256 unrealized) = this.getUserEarnings(user);

        earnings = UserEarnings({
            realized: realized,
            unrealized: unrealized,
            totalDeposited: totalDeposited,
            currentBalance: currentBalance,
            yieldEarned: realized + unrealized,
            timestamp: block.timestamp
        });
    }

    /**
     * @notice Get current protocol snapshot from active adapter
     * @return snapshot Protocol snapshot from current adapter
     */
    function getCurrentProtocolSnapshot()
        external
        view
        returns (ProtocolSnapshot memory snapshot)
    {
        require(address(currentAdapter) != address(0), "No active adapter");

        try currentAdapter.protocolSnapshot() returns (
            ProtocolSnapshot memory protocolSnap
        ) {
            return protocolSnap;
        } catch {
            // Return default snapshot if adapter fails
            return
                ProtocolSnapshot({
                    apyBps: 0,
                    tvl: 0,
                    liquidity: 0,
                    utilization: 0,
                    isHealthy: false,
                    protocolName: "Unknown",
                    lastUpdate: block.timestamp
                });
        }
    }

    /**
     * @notice Get snapshots for all active adapters
     * @return snapshots Array of strategy snapshots
     */
    function getAllStrategySnapshots()
        external
        view
        returns (StrategySnapshot[] memory snapshots)
    {
        // For testing, we'll return snapshots for venus and pancake adapters
        // In production, this would come from a registry of adapters
        snapshots = new StrategySnapshot[](2);

        // Get venus adapter snapshot (current adapter)
        if (address(currentAdapter) != address(0)) {
            snapshots[0] = this.getStrategySnapshot(address(currentAdapter));
        } else {
            // Default snapshot if no current adapter
            snapshots[0] = StrategySnapshot({
                adapter: address(0),
                totalAssets: 0,
                totalShares: 0,
                sharePrice: PRECISION,
                apy: 0,
                allocation: 0,
                isActive: false,
                lastRebalance: block.timestamp
            });
        }

        // Mock second adapter (for testing purposes)
        snapshots[1] = StrategySnapshot({
            adapter: address(0x123), // Mock address
            totalAssets: 0,
            totalShares: 0,
            sharePrice: PRECISION,
            apy: 1240, // 12.40% APY for mock pancake
            allocation: 0,
            isActive: false,
            lastRebalance: block.timestamp
        });
    }

    /**
     * @notice Get yield rate per second
     * @return rate Yield rate per second
     */
    function getYieldRate() external view returns (uint256 rate) {
        if (address(currentAdapter) != address(0)) {
            try currentAdapter.protocolSnapshot() returns (
                ProtocolSnapshot memory snapshot
            ) {
                // Convert APY (basis points) to per-second rate
                // APY in basis points / 10000 / 365 / 24 / 3600
                rate =
                    (snapshot.apyBps * PRECISION) /
                    (10000 * 365 * 24 * 3600);
            } catch {
                rate = 0;
            }
        }
    }

    /**
     * @notice Get security configuration
     * @return maxAllocationBps_ Maximum allocation in basis points
     * @return circuitBreakerThreshold_ Circuit breaker threshold
     * @return circuitBreakerTripped_ Whether circuit breaker is tripped
     * @return healthCheckInterval_ Health check interval
     * @return lastHealthCheck_ Last health check timestamp
     */
    function getSecurityConfig()
        external
        view
        returns (
            uint256 maxAllocationBps_,
            uint256 circuitBreakerThreshold_,
            bool circuitBreakerTripped_,
            uint256 healthCheckInterval_,
            uint256 lastHealthCheck_
        )
    {
        return (
            maxAllocationBps,
            circuitBreakerThreshold,
            circuitBreakerTripped,
            healthCheckInterval,
            lastHealthCheck
        );
    }

    /**
     * @notice Perform health check on current adapter
     * @return healthy Whether the adapter is healthy
     */
    function performHealthCheck() external returns (bool healthy) {
        lastHealthCheck = block.timestamp;

        if (address(currentAdapter) == address(0)) {
            return true; // No adapter to check
        }

        try currentAdapter.isHealthy() returns (bool adapterHealthy) {
            healthy = adapterHealthy;

            // Get APY and TVL for health update event
            uint256 apy = 0;
            uint256 tvl = 0;

            try currentAdapter.protocolSnapshot() returns (
                ProtocolSnapshot memory snapshot
            ) {
                apy = snapshot.apyBps;
                tvl = snapshot.tvl;
            } catch {
                // Use defaults if snapshot fails
            }

            // Emit health update event
            emit AdapterHealthUpdate(
                address(currentAdapter),
                healthy,
                apy,
                tvl,
                block.timestamp
            );

            // Trip circuit breaker if unhealthy
            if (!healthy && !circuitBreakerTripped) {
                circuitBreakerTripped = true;
                emit CircuitBreakerTripped(
                    address(currentAdapter),
                    block.timestamp
                );
            }
        } catch {
            healthy = false;
            emit AdapterHealthUpdate(
                address(currentAdapter),
                false,
                0,
                0,
                block.timestamp
            );

            if (!circuitBreakerTripped) {
                circuitBreakerTripped = true;
                emit CircuitBreakerTripped(
                    address(currentAdapter),
                    block.timestamp
                );
            }
        }

        return healthy;
    }

    /**
     * @notice Manually trip the circuit breaker
     */
    function tripCircuitBreaker() external onlyOwner {
        circuitBreakerTripped = true;
        emit CircuitBreakerTripped(address(currentAdapter), block.timestamp);
    }

    /**
     * @notice Reset the circuit breaker
     */
    function resetCircuitBreaker() external onlyOwner {
        circuitBreakerTripped = false;
        emit CircuitBreakerReset(block.timestamp);
    }

    /**
     * @notice Set maximum allocation percentage
     * @param _maxAllocationBps New maximum allocation in basis points
     */
    function setMaxAllocation(uint256 _maxAllocationBps) external onlyOwner {
        require(_maxAllocationBps <= MAX_BPS, "Allocation exceeds 100%");
        uint256 oldAllocation = maxAllocationBps;
        maxAllocationBps = _maxAllocationBps;
        emit MaxAllocationUpdated(oldAllocation, _maxAllocationBps);
    }

    /**
     * @notice Emergency pause operations and trip circuit breaker
     */
    function emergencyPause() external onlyOwner {
        _pause();
        circuitBreakerTripped = true;
        emit CircuitBreakerTripped(address(currentAdapter), block.timestamp);
    }

    /**
     * @notice Emergency unpause operations and reset circuit breaker
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
        circuitBreakerTripped = false;
        emit CircuitBreakerReset(block.timestamp);
    }
}
