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
    
    constructor(address _vault) Ownable(msg.sender) {
        require(_vault != address(0), "Invalid vault address");
        
        vault = AIONVault(payable(_vault));
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
     * @notice Get AI recommendation for yield optimization using REAL on-chain data
     * @return recommendation Full AI recommendation with confidence score
     * @dev Analyzes real strategy data: APY, TVL, risk, and historical performance
     */
    function getAIRecommendation()
        public
        view
        returns (ISomniaAI.StrategyRecommendation memory recommendation)
    {
        require(registeredStrategies.length > 0, "No strategies registered");
        
        // Analyze REAL data from all registered strategies
        uint256 bestScore = 0;
        address bestStrategy = address(0);
        uint256 bestAPY = 0;
        uint256 bestConfidence = 0;
        
        for (uint256 i = 0; i < registeredStrategies.length; i++) {
            address strategyAddr = registeredStrategies[i];
            IStrategyAdapter adapter = IStrategyAdapter(strategyAddr);
            
            // Get REAL on-chain data
            uint256 apy = adapter.estimatedAPY(); // Real APY from protocol
            uint256 tvl = adapter.totalAssets(); // Real TVL
            uint256 riskLevel = adapter.riskLevel(); // Real risk assessment
            bool isHealthy = adapter.isHealthy(); // Real health status
            
            // Skip unhealthy strategies
            if (!isHealthy) continue;
            
            // Calculate risk-adjusted score using REAL data
            // Formula: score = APY * (10 - riskLevel) * TVL_factor / 100
            uint256 riskFactor = riskLevel <= 10 ? 10 - riskLevel : 1;
            uint256 tvlFactor = tvl > 1 ether ? 110 : (tvl > 0.1 ether ? 105 : 100);
            
            uint256 score = (apy * riskFactor * tvlFactor) / 100;
            
            // Calculate confidence based on real data quality
            uint256 confidence = _calculateRealConfidence(
                apy,
                tvl,
                riskLevel,
                strategyPerformance[strategyAddr].successfulRebalances
            );
            
            // Update best if this strategy is better
            if (score > bestScore) {
                bestScore = score;
                bestStrategy = strategyAddr;
                bestAPY = apy;
                bestConfidence = confidence;
            }
        }
        
        require(bestStrategy != address(0), "No suitable strategy found");
        
        // Return recommendation based on REAL analysis
        recommendation = ISomniaAI.StrategyRecommendation({
            recommendedStrategy: bestStrategy,
            confidence: bestConfidence,
            expectedAPY: bestAPY,
            riskAdjustedScore: bestScore,
            reasoning: abi.encode(
                "Real-time analysis of on-chain APY, TVL, risk, and historical performance"
            )
        });
        
        return recommendation;
    }
    
    /**
     * @notice Calculate confidence score based on REAL data quality
     * @param apy Real APY from protocol
     * @param tvl Real total value locked
     * @param riskLevel Real risk assessment
     * @param successfulRebalances Historical success count
     * @return confidence Confidence score (0-100)
     */
    function _calculateRealConfidence(
        uint256 apy,
        uint256 tvl,
        uint256 riskLevel,
        uint256 successfulRebalances
    ) internal pure returns (uint256 confidence) {
        // Start with base confidence
        confidence = 60;
        
        // Higher APY = higher confidence (up to +15)
        if (apy >= 1000) confidence += 15; // 10%+ APY
        else if (apy >= 500) confidence += 10; // 5%+ APY
        else if (apy >= 200) confidence += 5; // 2%+ APY
        
        // Higher TVL = more data = higher confidence (up to +10)
        if (tvl >= 10 ether) confidence += 10;
        else if (tvl >= 1 ether) confidence += 5;
        
        // Lower risk = higher confidence (up to +10)
        if (riskLevel <= 3) confidence += 10; // Low risk
        else if (riskLevel <= 5) confidence += 5; // Medium risk
        
        // Successful history = higher confidence (up to +10)
        if (successfulRebalances >= 10) confidence += 10;
        else if (successfulRebalances >= 5) confidence += 5;
        
        // Cap at 95 (never 100% certain)
        if (confidence > 95) confidence = 95;
        
        return confidence;
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
     * @notice Check if rebalancing is recommended using REAL on-chain data
     * @return shouldRebalance Whether rebalancing is recommended
     * @return targetStrategy Recommended target strategy
     * @return confidence AI confidence score
     * @dev Uses real APY comparison and risk analysis
     */
    function checkRebalanceRecommendation()
        external
        view
        returns (bool shouldRebalance, address targetStrategy, uint256 confidence)
    {
        address currentAdapter = vault.getCurrentAdapter();
        uint256 vaultTVL = vault.totalAssets();
        
        // Don't rebalance if TVL too low (gas efficiency)
        if (vaultTVL < 0.001 ether) {
            return (false, address(0), 0);
        }
        
        // Get current strategy's REAL data
        uint256 currentAPY = 0;
        uint256 currentRisk = 10;
        
        if (currentAdapter != address(0)) {
            try IStrategyAdapter(currentAdapter).estimatedAPY() returns (uint256 apy) {
                currentAPY = apy;
            } catch {}
            
            try IStrategyAdapter(currentAdapter).riskLevel() returns (uint8 risk) {
                currentRisk = risk;
            } catch {}
        }
        
        // Find better strategy using REAL data
        ISomniaAI.StrategyRecommendation memory recommendation = this.getAIRecommendation();
        
        // Calculate improvement threshold (must be significant to justify gas)
        uint256 currentScore = currentAPY * (10 - currentRisk);
        uint256 newScore = recommendation.riskAdjustedScore;
        
        // Rebalance only if improvement is > 20%
        if (newScore > currentScore && ((newScore - currentScore) * 100) / currentScore > 20) {
            return (true, recommendation.recommendedStrategy, recommendation.confidence);
        }
        
        return (false, address(0), 0);
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
            uint256 confidenceThreshold,
            uint256 cooldown,
            bool autonomous,
            bool stopped
        )
    {
        return (
            address(vault),
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

