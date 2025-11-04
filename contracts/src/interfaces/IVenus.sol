// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title Venus Protocol Interfaces
 * @notice Enhanced interfaces for Venus Protocol integration
 * @dev Provides comprehensive interface definitions for Venus vBNB and Comptroller
 */

/// @title IVBNB - Enhanced Venus vBNB Token Interface
/// @notice Interface for Venus vBNB token contract with comprehensive error handling
interface IVBNB {
    /// @notice Mint vBNB tokens by supplying BNB
    /// @dev Payable function that accepts BNB and mints vBNB tokens
    function mint() external payable;

    /// @notice Redeem underlying BNB by burning vBNB tokens
    /// @param redeemAmount The amount of underlying BNB to redeem
    /// @return Error code (0 = success, non-zero = error)
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);

    /// @notice Redeem vBNB tokens for underlying BNB
    /// @param redeemTokens The amount of vBNB tokens to redeem
    /// @return Error code (0 = success, non-zero = error)
    function redeem(uint256 redeemTokens) external returns (uint256);

    /// @notice Get the underlying BNB balance for an account
    /// @param account The account to query
    /// @return The underlying BNB balance (principal + accrued interest)
    /// @dev This function is not view and may modify state for interest accrual
    function balanceOfUnderlying(address account) external returns (uint256);

    /// @notice Get the vBNB token balance for an account
    /// @param account The account to query
    /// @return The vBNB token balance
    function balanceOf(address account) external view returns (uint256);

    /// @notice Get the current exchange rate from vBNB to BNB
    /// @return The exchange rate scaled by 1e18
    function exchangeRateStored() external view returns (uint256);

    /// @notice Get the current exchange rate and accrue interest
    /// @return The current exchange rate scaled by 1e18
    function exchangeRateCurrent() external returns (uint256);

    /// @notice Get the current supply rate per block
    /// @return The supply rate per block scaled by 1e18
    function supplyRatePerBlock() external view returns (uint256);

    /// @notice Get the current borrow rate per block
    /// @return The borrow rate per block scaled by 1e18
    function borrowRatePerBlock() external view returns (uint256);

    /// @notice Get the total supply of vBNB tokens
    /// @return The total supply of vBNB tokens
    function totalSupply() external view returns (uint256);

    /// @notice Get the total amount of underlying BNB supplied
    /// @return The total underlying BNB supplied
    function totalBorrows() external view returns (uint256);

    /// @notice Get the cash (BNB) held by the contract
    /// @return The amount of BNB held by the contract
    function getCash() external view returns (uint256);

    /// @notice Get the comptroller address managing this vToken market
    /// @return comptroller The address of the comptroller contract
    function comptroller() external view returns (address comptroller);
}

/// @title IComptroller - Venus Comptroller Interface
/// @notice Interface for Venus Comptroller contract for market data and health checks
interface IComptroller {
    /// @notice Get the supply rate for a market
    /// @param vToken The vToken market address
    /// @return The supply rate per block
    function supplyRatePerBlock(address vToken) external view returns (uint256);

    /// @notice Get the borrow rate for a market
    /// @param vToken The vToken market address
    /// @return The borrow rate per block
    function borrowRatePerBlock(address vToken) external view returns (uint256);

    /// @notice Check if a market is listed
    /// @param vToken The vToken market address
    /// @return isListed True if the market is listed
    /// @return collateralFactorMantissa The collateral factor mantissa for the market
    function markets(
        address vToken
    ) external view returns (bool isListed, uint256 collateralFactorMantissa);

    /// @notice Get the Venus distribution speeds for a market
    /// @param vToken The vToken market address
    /// @return The Venus distribution speed
    function venusSupplySpeeds(address vToken) external view returns (uint256);

    /// @notice Get the Venus distribution speeds for borrowers
    /// @param vToken The vToken market address
    /// @return The Venus distribution speed for borrowers
    function venusBorrowSpeeds(address vToken) external view returns (uint256);

    /// @notice Get all markets
    /// @return Array of all vToken market addresses
    function getAllMarkets() external view returns (address[] memory);

    /// @notice Check if the comptroller is active
    /// @return True if the comptroller is active
    function comptrollerImplementation() external view returns (address);
}

/// @title IVenusOracle - Venus Price Oracle Interface
/// @notice Interface for Venus price oracle for asset pricing
interface IVenusOracle {
    /// @notice Get the underlying price of a vToken asset
    /// @param vToken The vToken to get the underlying price of
    /// @return The underlying asset price scaled by 1e18
    function getUnderlyingPrice(address vToken) external view returns (uint256);
}

/// @title Venus Error Codes
/// @notice Standard Venus protocol error codes for proper error handling
library VenusErrorCodes {
    uint256 public constant NO_ERROR = 0;
    uint256 public constant UNAUTHORIZED = 1;
    uint256 public constant BAD_INPUT = 2;
    uint256 public constant COMPTROLLER_REJECTION = 3;
    uint256 public constant COMPTROLLER_CALCULATION_ERROR = 4;
    uint256 public constant INTEREST_RATE_MODEL_ERROR = 5;
    uint256 public constant INVALID_ACCOUNT_PAIR = 6;
    uint256 public constant INVALID_CLOSE_AMOUNT_REQUESTED = 7;
    uint256 public constant INVALID_COLLATERAL_FACTOR = 8;
    uint256 public constant MATH_ERROR = 9;
    uint256 public constant MARKET_NOT_FRESH = 10;
    uint256 public constant MARKET_NOT_LISTED = 11;
    uint256 public constant TOKEN_INSUFFICIENT_ALLOWANCE = 12;
    uint256 public constant TOKEN_INSUFFICIENT_BALANCE = 13;
    uint256 public constant TOKEN_INSUFFICIENT_CASH = 14;
    uint256 public constant TOKEN_TRANSFER_IN_FAILED = 15;
    uint256 public constant TOKEN_TRANSFER_OUT_FAILED = 16;
    uint256 public constant INSUFFICIENT_LIQUIDITY = 17;
}
