// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../interfaces/ISomniaAI.sol";

/**
 * @title SomniaAIMock - Mock implementation of Somnia AI Engine
 * @notice This mock simulates AI recommendations for testing and development
 * @dev Replace with actual Somnia AI SDK integration in production
 */
contract SomniaAIMock is ISomniaAI {
    string public constant MODEL_VERSION = "v1.0.0-mock";
    uint256 public lastUpdate;
    bool public isActive = true;
    
    // Mock AI decision parameters
    uint256 public preferredAPYThreshold = 1000; // 10% in basis points
    uint256 public baseConfidence = 85; // Base confidence score
    
    constructor() {
        lastUpdate = block.timestamp;
    }
    
    /**
     * @notice Mock implementation of yield recommendation
     * @dev Returns deterministic recommendation based on APY
     */
    function getYieldRecommendation(
        StrategyAnalysisRequest calldata request
    ) external view override returns (StrategyRecommendation memory recommendation) {
        // Simple mock logic: prefer higher APY with risk adjustment
        uint256 riskAdjustedScore = _calculateRiskAdjustedScore(
            request.currentAPY,
            request.riskScore
        );
        
        // Calculate confidence based on APY and risk
        uint256 confidence = _calculateConfidence(
            request.currentAPY,
            request.riskScore,
            request.tvl
        );
        
        recommendation = StrategyRecommendation({
            recommendedStrategy: request.strategyAddress,
            confidence: confidence,
            expectedAPY: request.currentAPY,
            riskAdjustedScore: riskAdjustedScore,
            reasoning: abi.encode("Mock AI recommendation based on APY and risk analysis")
        });
    }
    
    /**
     * @notice Mock implementation of best strategy analysis
     * @dev Returns strategy with highest risk-adjusted score
     */
    function analyzeBestStrategy(
        StrategyAnalysisRequest[] calldata strategies
    )
        external
        view
        override
        returns (uint256 bestStrategy, StrategyRecommendation memory recommendation)
    {
        require(strategies.length > 0, "No strategies provided");
        
        uint256 bestScore = 0;
        uint256 bestIndex = 0;
        
        // Find strategy with highest risk-adjusted score
        for (uint256 i = 0; i < strategies.length; i++) {
            uint256 score = _calculateRiskAdjustedScore(
                strategies[i].currentAPY,
                strategies[i].riskScore
            );
            
            if (score > bestScore) {
                bestScore = score;
                bestIndex = i;
            }
        }
        
        // Generate recommendation for best strategy
        StrategyAnalysisRequest memory bestStrategyRequest = strategies[bestIndex];
        
        uint256 confidence = _calculateConfidence(
            bestStrategyRequest.currentAPY,
            bestStrategyRequest.riskScore,
            bestStrategyRequest.tvl
        );
        
        recommendation = StrategyRecommendation({
            recommendedStrategy: bestStrategyRequest.strategyAddress,
            confidence: confidence,
            expectedAPY: bestStrategyRequest.currentAPY,
            riskAdjustedScore: bestScore,
            reasoning: abi.encode(
                "Selected best strategy based on risk-adjusted performance analysis"
            )
        });
        
        return (bestIndex, recommendation);
    }
    
    /**
     * @notice Mock implementation of rebalance recommendation
     * @dev Recommends rebalancing if better options are available
     */
    function getRebalanceRecommendation(
        address currentStrategy,
        address[] calldata availableStrategies,
        uint256 vaultTVL
    )
        external
        view
        override
        returns (bool shouldRebalance, address targetStrategy, uint256 confidence)
    {
        // Mock logic: recommend rebalancing based on simple heuristics
        
        // If no strategies available, don't rebalance
        if (availableStrategies.length == 0) {
            return (false, address(0), 0);
        }
        
        // If TVL is very low, don't recommend rebalancing (gas efficiency)
        if (vaultTVL < 0.01 ether) {
            return (false, address(0), 0);
        }
        
        // Simulate: recommend first available strategy that's not current
        for (uint256 i = 0; i < availableStrategies.length; i++) {
            if (availableStrategies[i] != currentStrategy) {
                // Mock confidence based on TVL (higher TVL = more confident)
                uint256 mockConfidence = vaultTVL > 1 ether ? 90 : 75;
                
                return (true, availableStrategies[i], mockConfidence);
            }
        }
        
        // All strategies are the same as current, don't rebalance
        return (false, address(0), 0);
    }
    
    /**
     * @notice Get model information
     */
    function getModelInfo()
        external
        view
        override
        returns (string memory modelVersion, uint256 lastUpdateTime, bool active)
    {
        return (MODEL_VERSION, lastUpdate, isActive);
    }
    
    // ========== Internal Helper Functions ==========
    
    /**
     * @notice Calculate risk-adjusted score for a strategy
     * @param apy Annual percentage yield in basis points
     * @param riskScore Risk score (0-100)
     * @return score Risk-adjusted score
     */
    function _calculateRiskAdjustedScore(
        uint256 apy,
        uint256 riskScore
    ) internal pure returns (uint256 score) {
        // Formula: score = APY * (100 - riskScore) / 100
        // This penalizes high-risk strategies
        require(riskScore <= 100, "Invalid risk score");
        
        uint256 riskFactor = 100 - riskScore;
        score = (apy * riskFactor) / 100;
        
        return score;
    }
    
    /**
     * @notice Calculate confidence score for a recommendation
     * @param apy Annual percentage yield
     * @param riskScore Risk score
     * @param tvl Total value locked
     * @return confidence Confidence score (0-100)
     */
    function _calculateConfidence(
        uint256 apy,
        uint256 riskScore,
        uint256 tvl
    ) internal view returns (uint256 confidence) {
        // Start with base confidence
        confidence = baseConfidence;
        
        // Adjust based on APY (higher APY = higher confidence, up to threshold)
        if (apy >= preferredAPYThreshold) {
            confidence += 10; // Bonus for meeting APY threshold
        }
        
        // Adjust based on risk (lower risk = higher confidence)
        if (riskScore < 30) {
            confidence += 5; // Bonus for low risk
        } else if (riskScore > 70) {
            confidence -= 10; // Penalty for high risk
        }
        
        // Adjust based on TVL (higher TVL = more data = higher confidence)
        if (tvl > 10 ether) {
            confidence += 5;
        }
        
        // Cap at 100
        if (confidence > 100) {
            confidence = 100;
        }
        
        return confidence;
    }
    
    // ========== Admin Functions ==========
    
    /**
     * @notice Update preferred APY threshold
     * @param _threshold New threshold in basis points
     */
    function setPreferredAPYThreshold(uint256 _threshold) external {
        preferredAPYThreshold = _threshold;
    }
    
    /**
     * @notice Update base confidence score
     * @param _confidence New base confidence (0-100)
     */
    function setBaseConfidence(uint256 _confidence) external {
        require(_confidence <= 100, "Invalid confidence");
        baseConfidence = _confidence;
    }
    
    /**
     * @notice Toggle model active status
     */
    function toggleActive() external {
        isActive = !isActive;
        lastUpdate = block.timestamp;
    }
}

