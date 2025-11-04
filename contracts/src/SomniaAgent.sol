// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ISomniaAI.sol";
import "./interfaces/IStrategyAdapter.sol";
import "./AIONVault.sol";

/**
 * @title SomniaAgent - Autonomous AI Agent for AION Vault
 * @notice This agent uses Somnia AI to autonomously optimize yield strategies
 * @dev Integrates with Somnia AI Engine for on-chain machine learning decisions
 * @author Samar - AION Team
 */
contract SomniaAgent is Ownable, ReentrancyGuard {
    // ========== State Variables ==========
    
    /// @notice Reference to Somnia AI Engine
    ISomniaAI public somniaAI;
    
    /// @notice Reference to AION Vault
    AIONVault public vault;
    
    /// @notice Minimum confidence threshold for AI recommendations (0-100)
    uint256 public minConfidenceThreshold = 70;
    
    /// @notice Minimum time between rebalancing operations (in seconds)
    uint256 public rebalanceCooldown = 1 hours;
    
    /// @notice Last rebalancing timestamp
    uint256 public lastRebalanceTime;
    
    /// @notice Autonomous mode enabled/disabled
    bool public autonomousModeEnabled = true;
    
    /// @notice Emergency stop switch
    bool public emergencyStop = false;
    
    /// @notice Registered strategies for AI analysis
    address[] public registeredStrategies;
    mapping(address => bool) public isStrategyRegistered;
    
    /// @notice Performance tracking for strategies
    mapping(address => StrategyPerformance) public strategyPerformance;
    
    /**
     * @notice Structure to track strategy performance
     * @param totalDeposited Total amount deposited to strategy
     * @param totalWithdrawn Total amount withdrawn from strategy
     * @param lastAPY Last recorded APY
     * @param successfulRebalances Number of successful rebalances
     * @param lastUpdate Last update timestamp
     */
    struct StrategyPerformance {
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 lastAPY;
        uint256 successfulRebalances;
        uint256 lastUpdate;
    }
    
    // ========== Events ==========
    
    event SomniaAIUpdated(address indexed newAI);
    event StrategyRegistered(address indexed strategy);
    event StrategyRemoved(address indexed strategy);
    event AIRecommendationReceived(
        address indexed recommendedStrategy,
        uint256 confidence,
        uint256 expectedAPY
    );
    event AutoRebalanceExecuted(
        address indexed fromStrategy,
        address indexed toStrategy,
        uint256 amount,
        uint256 timestamp
    );
    event ConfidenceThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event AutonomousModeToggled(bool enabled);
    event EmergencyStopActivated(uint256 timestamp);
    event RebalanceCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
    
    // ========== Modifiers ==========
    
    modifier whenNotStopped() {
        require(!emergencyStop, "Emergency stop activated");
        _;
    }
    
    modifier whenAutonomous() {
        require(autonomousModeEnabled, "Autonomous mode disabled");
        _;
    }
    
    modifier cooldownPassed() {
        require(
            block.timestamp >= lastRebalanceTime + rebalanceCooldown,
            "Rebalance cooldown not passed"
        );
        _;
    }
    
    // ========== Constructor ==========
    
    constructor(
        address _vault,
        address _somniaAI
    ) Ownable(msg.sender) {
        require(_vault != address(0), "Invalid vault address");
        require(_somniaAI != address(0), "Invalid Somnia AI address");
        
        vault = AIONVault(payable(_vault));
        somniaAI = ISomniaAI(_somniaAI);
        lastRebalanceTime = block.timestamp;
    }
    
    // ========== Core Functions ==========
    
    /**
     * @notice Register a strategy for AI analysis
     * @param strategy Address of the strategy adapter
     */
    function registerStrategy(address strategy) external onlyOwner {
        require(strategy != address(0), "Invalid strategy address");
        require(!isStrategyRegistered[strategy], "Strategy already registered");
        
        registeredStrategies.push(strategy);
        isStrategyRegistered[strategy] = true;
        
        emit StrategyRegistered(strategy);
    }
    
    /**
     * @notice Remove a strategy from AI analysis
     * @param strategy Address of the strategy adapter
     */
    function removeStrategy(address strategy) external onlyOwner {
        require(isStrategyRegistered[strategy], "Strategy not registered");
        
        // Remove from array
        for (uint256 i = 0; i < registeredStrategies.length; i++) {
            if (registeredStrategies[i] == strategy) {
                registeredStrategies[i] = registeredStrategies[
                    registeredStrategies.length - 1
                ];
                registeredStrategies.pop();
                break;
            }
        }
        
        isStrategyRegistered[strategy] = false;
        
        emit StrategyRemoved(strategy);
    }
    
    /**
     * @notice Get AI recommendation for yield optimization
     * @return recommendation Full AI recommendation with confidence score
     */
    function getAIRecommendation()
        public
        view
        returns (ISomniaAI.StrategyRecommendation memory recommendation)
    {
        require(registeredStrategies.length > 0, "No strategies registered");
        
        // Prepare strategy analysis requests
        ISomniaAI.StrategyAnalysisRequest[]
            memory requests = new ISomniaAI.StrategyAnalysisRequest[](
                registeredStrategies.length
            );
        
        for (uint256 i = 0; i < registeredStrategies.length; i++) {
            address strategyAddr = registeredStrategies[i];
            IStrategyAdapter adapter = IStrategyAdapter(strategyAddr);
            
            // Gather strategy data
            requests[i] = ISomniaAI.StrategyAnalysisRequest({
                strategyAddress: strategyAddr,
                currentAPY: adapter.estimatedAPY(),
                riskScore: adapter.riskLevel() * 10, // Convert to 0-100 scale
                tvl: adapter.totalAssets(),
                historicalPerformance: abi.encode(
                    strategyPerformance[strategyAddr]
                )
            });
        }
        
        // Get AI recommendation
        (, recommendation) = somniaAI.analyzeBestStrategy(requests);
        
        return recommendation;
    }
    
    /**
     * @notice Execute autonomous rebalancing based on AI recommendation
     * @dev Only callable when autonomous mode is enabled and cooldown passed
     */
    function executeAutonomousRebalance()
        external
        nonReentrant
        whenNotStopped
        whenAutonomous
        cooldownPassed
    {
        // Get AI recommendation
        ISomniaAI.StrategyRecommendation memory recommendation = getAIRecommendation();
        
        // Check confidence threshold
        require(
            recommendation.confidence >= minConfidenceThreshold,
            "AI confidence below threshold"
        );
        
        emit AIRecommendationReceived(
            recommendation.recommendedStrategy,
            recommendation.confidence,
            recommendation.expectedAPY
        );
        
        // Get current adapter
        address currentAdapter = vault.getCurrentAdapter();
        
        // Only rebalance if recommendation is different from current
        if (currentAdapter != recommendation.recommendedStrategy) {
            // Calculate amount to rebalance (all assets)
            uint256 amountToRebalance = vault.totalAssets();
            
            if (amountToRebalance > 0) {
                // Execute rebalance through vault
                vault.rebalance(
                    currentAdapter,
                    recommendation.recommendedStrategy,
                    amountToRebalance
                );
                
                // Update performance tracking
                _updatePerformanceTracking(
                    currentAdapter,
                    recommendation.recommendedStrategy,
                    amountToRebalance
                );
                
                // Update last rebalance time
                lastRebalanceTime = block.timestamp;
                
                emit AutoRebalanceExecuted(
                    currentAdapter,
                    recommendation.recommendedStrategy,
                    amountToRebalance,
                    block.timestamp
                );
            }
        }
    }
    
    /**
     * @notice Manual rebalancing with AI recommendation (owner only)
     * @param targetStrategy Target strategy address
     * @param amount Amount to rebalance
     */
    function manualRebalance(
        address targetStrategy,
        uint256 amount
    ) external onlyOwner nonReentrant whenNotStopped {
        require(isStrategyRegistered[targetStrategy], "Strategy not registered");
        
        address currentAdapter = vault.getCurrentAdapter();
        require(currentAdapter != targetStrategy, "Already using target strategy");
        
        // Execute rebalance
        vault.rebalance(currentAdapter, targetStrategy, amount);
        
        // Update tracking
        _updatePerformanceTracking(currentAdapter, targetStrategy, amount);
        lastRebalanceTime = block.timestamp;
        
        emit AutoRebalanceExecuted(
            currentAdapter,
            targetStrategy,
            amount,
            block.timestamp
        );
    }
    
    /**
     * @notice Check if rebalancing is recommended by AI
     * @return shouldRebalance Whether rebalancing is recommended
     * @return targetStrategy Recommended target strategy
     * @return confidence AI confidence score
     */
    function checkRebalanceRecommendation()
        external
        view
        returns (bool shouldRebalance, address targetStrategy, uint256 confidence)
    {
        address currentAdapter = vault.getCurrentAdapter();
        uint256 vaultTVL = vault.totalAssets();
        
        return
            somniaAI.getRebalanceRecommendation(
                currentAdapter,
                registeredStrategies,
                vaultTVL
            );
    }
    
    // ========== Internal Functions ==========
    
    /**
     * @notice Update performance tracking for strategies
     * @param fromStrategy Source strategy
     * @param toStrategy Target strategy
     * @param amount Amount rebalanced
     */
    function _updatePerformanceTracking(
        address fromStrategy,
        address toStrategy,
        uint256 amount
    ) internal {
        // Update source strategy
        strategyPerformance[fromStrategy].totalWithdrawn += amount;
        strategyPerformance[fromStrategy].lastUpdate = block.timestamp;
        
        // Update target strategy
        strategyPerformance[toStrategy].totalDeposited += amount;
        strategyPerformance[toStrategy].successfulRebalances += 1;
        strategyPerformance[toStrategy].lastUpdate = block.timestamp;
        
        // Update APY records
        try IStrategyAdapter(toStrategy).estimatedAPY() returns (uint256 apy) {
            strategyPerformance[toStrategy].lastAPY = apy;
        } catch {
            // APY fetch failed, skip update
        }
    }
    
    // ========== Admin Functions ==========
    
    /**
     * @notice Update Somnia AI address
     * @param _somniaAI New Somnia AI address
     */
    function setSomniaAI(address _somniaAI) external onlyOwner {
        require(_somniaAI != address(0), "Invalid Somnia AI address");
        somniaAI = ISomniaAI(_somniaAI);
        emit SomniaAIUpdated(_somniaAI);
    }
    
    /**
     * @notice Update minimum confidence threshold
     * @param _threshold New threshold (0-100)
     */
    function setMinConfidenceThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold <= 100, "Invalid threshold");
        uint256 oldThreshold = minConfidenceThreshold;
        minConfidenceThreshold = _threshold;
        emit ConfidenceThresholdUpdated(oldThreshold, _threshold);
    }
    
    /**
     * @notice Update rebalance cooldown period
     * @param _cooldown New cooldown in seconds
     */
    function setRebalanceCooldown(uint256 _cooldown) external onlyOwner {
        uint256 oldCooldown = rebalanceCooldown;
        rebalanceCooldown = _cooldown;
        emit RebalanceCooldownUpdated(oldCooldown, _cooldown);
    }
    
    /**
     * @notice Toggle autonomous mode
     */
    function toggleAutonomousMode() external onlyOwner {
        autonomousModeEnabled = !autonomousModeEnabled;
        emit AutonomousModeToggled(autonomousModeEnabled);
    }
    
    /**
     * @notice Activate emergency stop
     */
    function activateEmergencyStop() external onlyOwner {
        emergencyStop = true;
        emit EmergencyStopActivated(block.timestamp);
    }
    
    /**
     * @notice Deactivate emergency stop
     */
    function deactivateEmergencyStop() external onlyOwner {
        emergencyStop = false;
    }
    
    // ========== View Functions ==========
    
    /**
     * @notice Get all registered strategies
     * @return Array of registered strategy addresses
     */
    function getRegisteredStrategies() external view returns (address[] memory) {
        return registeredStrategies;
    }
    
    /**
     * @notice Get performance data for a strategy
     * @param strategy Strategy address
     * @return performance Strategy performance data
     */
    function getStrategyPerformance(
        address strategy
    ) external view returns (StrategyPerformance memory performance) {
        return strategyPerformance[strategy];
    }
    
    /**
     * @notice Get agent configuration
     * @return config Agent configuration struct
     */
    function getAgentConfig()
        external
        view
        returns (
            address vaultAddress,
            address somniaAIAddress,
            uint256 confidenceThreshold,
            uint256 cooldown,
            bool autonomous,
            bool stopped
        )
    {
        return (
            address(vault),
            address(somniaAI),
            minConfidenceThreshold,
            rebalanceCooldown,
            autonomousModeEnabled,
            emergencyStop
        );
    }
    
    /**
     * @notice Get time until next rebalance is available
     * @return timeRemaining Seconds until cooldown expires (0 if ready)
     */
    function getTimeUntilNextRebalance() external view returns (uint256 timeRemaining) {
        uint256 nextAllowedTime = lastRebalanceTime + rebalanceCooldown;
        if (block.timestamp >= nextAllowedTime) {
            return 0;
        }
        return nextAllowedTime - block.timestamp;
    }
}

