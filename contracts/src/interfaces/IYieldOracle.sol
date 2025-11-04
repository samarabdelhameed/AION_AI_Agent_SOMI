// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title IYieldOracle - Interface for real-time APY fetching from multiple protocols
/// @notice Provides standardized methods for fetching and calculating APY from various DeFi protocols
/// @dev All APY values are returned in basis points (e.g., 450 = 4.50%, -200 = -2.00%)

interface IYieldOracle {
    /// @notice Struct containing APY data for a specific protocol
    /// @param protocolId Unique identifier for the protocol
    /// @param apy APY in basis points (can be negative)
    /// @param timestamp Last update timestamp
    /// @param confidence Confidence level of the APY data (0-10000, where 10000 = 100%)
    /// @param source Data source identifier
    struct APYData {
        string protocolId;
        int256 apy;
        uint256 timestamp;
        uint256 confidence;
        string source;
    }

    /// @notice Struct containing strategy performance metrics
    /// @param strategyAddress Address of the strategy contract
    /// @param strategyName Human-readable strategy name
    /// @param currentAPY Current APY in basis points
    /// @param historicalAPY Average APY over the last 30 days
    /// @param volatility APY volatility (standard deviation)
    /// @param riskScore Risk score from 0-10000 (lower is safer)
    /// @param lastUpdate Last update timestamp
    struct StrategyMetrics {
        address strategyAddress;
        string strategyName;
        int256 currentAPY;
        int256 historicalAPY;
        uint256 volatility;
        uint256 riskScore;
        uint256 lastUpdate;
    }

    /// @notice Emitted when APY data is updated for a protocol
    /// @param protocolId Protocol identifier
    /// @param oldAPY Previous APY value
    /// @param newAPY New APY value
    /// @param timestamp Update timestamp
    event APYUpdated(
        string indexed protocolId,
        int256 oldAPY,
        int256 newAPY,
        uint256 timestamp
    );

    /// @notice Emitted when strategy metrics are updated
    /// @param strategyAddress Strategy contract address
    /// @param oldAPY Previous APY value
    /// @param newAPY New APY value
    /// @param riskScore Updated risk score
    event StrategyMetricsUpdated(
        address indexed strategyAddress,
        int256 oldAPY,
        int256 newAPY,
        uint256 riskScore
    );

    /// @notice Get current APY for a specific protocol
    /// @param protocolId Protocol identifier (e.g., "pancakeswap", "venus", "alpaca")
    /// @return apy Current APY in basis points
    /// @return timestamp Last update timestamp
    /// @return confidence Confidence level of the data
    function getProtocolAPY(
        string calldata protocolId
    ) external view returns (int256 apy, uint256 timestamp, uint256 confidence);

    /// @notice Get APY data for multiple protocols
    /// @param protocolIds Array of protocol identifiers
    /// @return apyData Array of APY data for each protocol
    function getMultipleProtocolAPYs(
        string[] calldata protocolIds
    ) external view returns (APYData[] memory apyData);

    /// @notice Get comprehensive metrics for a strategy
    /// @param strategyAddress Address of the strategy contract
    /// @return metrics Strategy performance metrics
    function getStrategyMetrics(
        address strategyAddress
    ) external view returns (StrategyMetrics memory metrics);

    /// @notice Get ranked list of strategies by APY performance
    /// @param limit Maximum number of strategies to return
    /// @param includeInactive Whether to include inactive strategies
    /// @return rankedStrategies Array of strategies ranked by APY
    function getRankedStrategies(
        uint256 limit,
        bool includeInactive
    ) external view returns (StrategyMetrics[] memory rankedStrategies);

    /// @notice Get APY comparison between multiple strategies
    /// @param strategyAddresses Array of strategy addresses to compare
    /// @return comparison Array of strategy metrics for comparison
    function compareStrategies(
        address[] calldata strategyAddresses
    ) external view returns (StrategyMetrics[] memory comparison);

    /// @notice Get risk-adjusted APY for a strategy (APY / risk score)
    /// @param strategyAddress Address of the strategy
    /// @return riskAdjustedAPY Risk-adjusted APY value
    function getRiskAdjustedAPY(
        address strategyAddress
    ) external view returns (int256 riskAdjustedAPY);

    /// @notice Check if APY data is fresh (updated within specified time)
    /// @param protocolId Protocol identifier
    /// @param maxAge Maximum age in seconds for data to be considered fresh
    /// @return isFresh True if data is fresh, false otherwise
    function isAPYDataFresh(
        string calldata protocolId,
        uint256 maxAge
    ) external view returns (bool isFresh);

    /// @notice Get supported protocol list
    /// @return protocols Array of supported protocol identifiers
    function getSupportedProtocols()
        external
        view
        returns (string[] memory protocols);

    /// @notice Get data source information for a protocol
    /// @param protocolId Protocol identifier
    /// @return source Data source name
    /// @return updateFrequency Update frequency in seconds
    /// @return lastUpdate Last update timestamp
    function getDataSourceInfo(
        string calldata protocolId
    )
        external
        view
        returns (
            string memory source,
            uint256 updateFrequency,
            uint256 lastUpdate
        );

    /// @notice EIP-165: Interface detection
    /// @param interfaceId Interface identifier
    /// @return True if interface is supported
    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    // New protocol-specific functions
    /// @notice Get Venus protocol APY with caching and fallback
    /// @return apy Current APY in basis points
    /// @return timestamp Last update timestamp
    /// @return confidence Confidence level of the data
    /// @return source Data source identifier
    function getVenusAPY()
        external
        view
        returns (
            int256 apy,
            uint256 timestamp,
            uint256 confidence,
            string memory source
        );

    /// @notice Get Aave protocol APY with caching and fallback
    /// @return apy Current APY in basis points
    /// @return timestamp Last update timestamp
    /// @return confidence Confidence level of the data
    /// @return source Data source identifier
    function getAaveAPY()
        external
        view
        returns (
            int256 apy,
            uint256 timestamp,
            uint256 confidence,
            string memory source
        );

    /// @notice Get Beefy protocol APY with caching and fallback
    /// @return apy Current APY in basis points
    /// @return timestamp Last update timestamp
    /// @return confidence Confidence level of the data
    /// @return source Data source identifier
    function getBeefyAPY()
        external
        view
        returns (
            int256 apy,
            uint256 timestamp,
            uint256 confidence,
            string memory source
        );

    /// @notice Get PancakeSwap protocol APY with caching and fallback
    /// @return apy Current APY in basis points
    /// @return timestamp Last update timestamp
    /// @return confidence Confidence level of the data
    /// @return source Data source identifier
    function getPancakeAPY()
        external
        view
        returns (
            int256 apy,
            uint256 timestamp,
            uint256 confidence,
            string memory source
        );

    /// @notice Check if cached APY data is stale and needs refresh
    /// @param protocolId Protocol identifier
    /// @return isStale True if data is stale, false otherwise
    function isAPYDataStale(
        string calldata protocolId
    ) external view returns (bool isStale);

    /// @notice Get fallback APY value for a protocol
    /// @param protocolId Protocol identifier
    /// @return fallbackAPY Fallback APY value in basis points
    function getFallbackAPY(
        string calldata protocolId
    ) external view returns (int256 fallbackAPY);

    /// @notice Get protocol-specific data source information
    /// @param protocolId Protocol identifier
    /// @return source Data source name
    /// @return updateFrequency Update frequency in seconds
    /// @return lastUpdate Last update timestamp
    function getProtocolDataSourceInfo(
        string calldata protocolId
    )
        external
        view
        returns (
            string memory source,
            uint256 updateFrequency,
            uint256 lastUpdate
        );
}
