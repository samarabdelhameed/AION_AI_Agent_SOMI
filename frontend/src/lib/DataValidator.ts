/**
 * Data Validator for validating API responses and data structures
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export class DataValidator {
  static validateMarketData(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      errors.push('Market data is null or undefined');
      return { valid: false, errors, warnings };
    }

    // Check for required fields
    if (!data.protocols || !Array.isArray(data.protocols)) {
      errors.push('Missing or invalid protocols array');
    } else {
      // Validate each protocol
      data.protocols.forEach((protocol: any, index: number) => {
        if (!protocol.name) {
          errors.push(`Protocol ${index} missing name`);
        }
        if (typeof protocol.apy !== 'number' || protocol.apy < 0) {
          errors.push(`Protocol ${index} has invalid APY`);
        }
        if (typeof protocol.tvl !== 'number' || protocol.tvl < 0) {
          errors.push(`Protocol ${index} has invalid TVL`);
        }
      });
    }

    if (typeof data.bnb_price_usd !== 'number' || data.bnb_price_usd <= 0) {
      errors.push('Invalid BNB price');
    }

    if (typeof data.total_tvl !== 'number' || data.total_tvl < 0) {
      errors.push('Invalid total TVL');
    }

    // Warnings for suspicious data
    if (data.bnb_price_usd && (data.bnb_price_usd < 100 || data.bnb_price_usd > 1000)) {
      warnings.push('BNB price seems unusual');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateVaultData(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      errors.push('Vault data is null or undefined');
      return { valid: false, errors, warnings };
    }

    if (typeof data.totalValueLocked !== 'number' || data.totalValueLocked < 0) {
      errors.push('Invalid total value locked');
    }

    if (typeof data.totalUsers !== 'number' || data.totalUsers < 0) {
      errors.push('Invalid total users count');
    }

    if (!data.currentStrategy || typeof data.currentStrategy !== 'string') {
      errors.push('Missing or invalid current strategy');
    }

    if (typeof data.apy !== 'number' || data.apy < 0) {
      errors.push('Invalid APY');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateUserData(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      errors.push('User data is null or undefined');
      return { valid: false, errors, warnings };
    }

    if (!data.address || typeof data.address !== 'string') {
      errors.push('Missing or invalid user address');
    }

    if (data.balance !== undefined && (typeof data.balance !== 'number' || data.balance < 0)) {
      errors.push('Invalid user balance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateApiResponse(response: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!response) {
      errors.push('Response is null or undefined');
      return { valid: false, errors, warnings };
    }

    if (typeof response.success !== 'boolean') {
      errors.push('Missing or invalid success field');
    }

    if (response.success && !response.data) {
      errors.push('Missing data field in successful response');
    }

    if (!response.success && !response.error) {
      warnings.push('Failed response without error message');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}