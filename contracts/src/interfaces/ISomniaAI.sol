// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title ISomniaAI - Interface for Somnia AI Engine
 * @notice Interface for interacting with Somnia AI models for yield optimization
 * @dev This interface connects to Somnia's on-chain AI execution engine
 */
interface ISomniaAI {
    /**
     * @notice Data structure for strategy analysis request
     * @param strategyAddress Address of the strategy to analyze
     * @param currentAPY Current APY of the strategy (in basis points)
     * @param riskScore Risk score of the strategy (0-100)
     * @param tvl Total value locked in the strategy
     * @param historicalPerformance Historical performance data (encoded)
     */
    struct StrategyAnalysisRequest {
        address strategyAddress;
        uint256 currentAPY;
        uint256 riskScore;
        uint256 tvl;
        bytes historicalPerformance;
    }

    /**
     * @notice Response from AI model for strategy recommendation
     * @param recommendedStrategy Address of recommended strategy
     * @param confidence Confidence score (0-100)
     * @param expectedAPY Expected APY from recommendation
     * @param riskAdjustedScore Risk-adjusted score
     * @param reasoning Encoded reasoning from AI model
     */
    struct StrategyRecommendation {
        address recommendedStrategy;
        uint256 confidence;
        uint256 expectedAPY;
        uint256 riskAdjustedScore;
        bytes reasoning;
    }

    /**
     * @notice Get yield optimization recommendation from AI model
     * @param request Strategy analysis request data
     * @return recommendation AI-generated strategy recommendation
     */
    function getYieldRecommendation(
        StrategyAnalysisRequest calldata request
    ) external view returns (StrategyRecommendation memory recommendation);

    /**
     * @notice Analyze multiple strategies and return best option
     * @param strategies Array of strategy analysis requests
     * @return bestStrategy Index of the best strategy
     * @return recommendation Full recommendation details
     */
    function analyzeBestStrategy(
        StrategyAnalysisRequest[] calldata strategies
    )
        external
        view
        returns (uint256 bestStrategy, StrategyRecommendation memory recommendation);

    /**
     * @notice Get rebalancing recommendation based on current market conditions
     * @param currentStrategy Current active strategy address
     * @param availableStrategies Array of available strategies to consider
     * @param vaultTVL Total value locked in the vault
     * @return shouldRebalance Whether rebalancing is recommended
     * @return targetStrategy Recommended target strategy (if rebalancing)
     * @return confidence AI confidence in recommendation (0-100)
     */
    function getRebalanceRecommendation(
        address currentStrategy,
        address[] calldata availableStrategies,
        uint256 vaultTVL
    )
        external
        view
        returns (bool shouldRebalance, address targetStrategy, uint256 confidence);

    /**
     * @notice Verify AI model signature and authenticity
     * @return modelVersion Version of the AI model
     * @return lastUpdate Last update timestamp
     * @return isActive Whether the model is currently active
     */
    function getModelInfo()
        external
        view
        returns (string memory modelVersion, uint256 lastUpdate, bool isActive);
}

