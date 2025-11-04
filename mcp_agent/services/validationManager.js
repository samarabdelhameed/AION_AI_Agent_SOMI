/**
 * @fileoverview Comprehensive Input Validation and Sanitization
 * @description Schema-based validation with security measures
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export class ValidationManager {
  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.setupCustomFormats();
    this.setupSchemas();
  }

  /**
   * Setup custom validation formats
   */
  setupCustomFormats() {
    // Ethereum address validation
    this.ajv.addFormat('ethereum-address', {
      type: 'string',
      validate: (address) => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      }
    });

    // Transaction hash validation
    this.ajv.addFormat('tx-hash', {
      type: 'string',
      validate: (hash) => {
        return /^0x[a-fA-F0-9]{64}$/.test(hash);
      }
    });

    // Network validation
    this.ajv.addFormat('network', {
      type: 'string',
      validate: (network) => ['bscTestnet', 'bscMainnet'].includes(network)
    });

    // Amount validation (positive number as string)
    this.ajv.addFormat('amount', {
      type: 'string',
      validate: (amount) => {
        const num = parseFloat(amount);
        return !isNaN(num) && num > 0 && num < 1e18;
      }
    });
  }

  /**
   * Setup validation schemas
   */
  setupSchemas() {
    // Decision request schema
    this.decideSchema = {
      type: 'object',
      required: ['network', 'amount', 'riskTolerance'],
      properties: {
        network: { 
          type: 'string', 
          enum: ['bscTestnet', 'bscMainnet', 'ethereum', 'polygon'],
          format: 'network'
        },
        amount: {
          type: 'string',
          format: 'amount'
        },
        riskTolerance: {
          type: 'string',
          enum: ['low', 'medium', 'high']
        },
        preferredStrategies: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 10
        }
      },
      additionalProperties: false
    };

    // Execution request schema
    this.executeSchema = {
      type: 'object',
      required: ['network', 'strategy', 'action', 'amount'],
      properties: {
        network: { 
          type: 'string', 
          enum: ['bscTestnet', 'bscMainnet', 'ethereum', 'polygon'],
          format: 'network'
        },
        strategy: {
          type: 'string',
          enum: ['venus', 'beefy', 'pancakeswap', 'aave']
        },
        action: {
          type: 'string',
          enum: ['deposit', 'withdraw', 'rebalance']
        },
        amount: {
          type: 'string',
          format: 'amount'
        },
        currency: {
          type: 'string',
          enum: ['BNB', 'ETH', 'USDC', 'USDT']
        },
        slippage: {
          type: 'number',
          minimum: 0.1,
          maximum: 5.0
        },
        deadline: {
          type: 'number',
          minimum: 60,
          maximum: 3600
        }
      },
      additionalProperties: false
    };
  }

  /**
   * Validate request data against schema
   */
  validateRequest(schema) {
    return (request, reply, done) => {
      const validate = this.ajv.compile(schema);
      const valid = validate(request.body);

      if (!valid) {
        const errors = validate.errors.map(err => ({
          field: err.instancePath || err.schemaPath,
          message: err.message,
          value: err.data
        }));

        reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: errors
        });
        return;
      }

      done();
    };
  }

  /**
   * Get schema by name
   */
  getDecideSchema() {
    return this.decideSchema;
  }

  getExecuteSchema() {
    return this.executeSchema;
  }

  /**
   * Sanitize string input
   */
  sanitizeString(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate Ethereum address
   */
  validateEthereumAddress(address) {
    if (!address || typeof address !== 'string') {
      return { valid: false, error: 'Address is required and must be a string' };
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return { valid: false, error: 'Invalid Ethereum address format' };
    }

    return { valid: true };
  }

  /**
   * Validate amount
   */
  validateAmount(amount) {
    if (!amount) {
      return { valid: false, error: 'Amount is required' };
    }

    const num = parseFloat(amount);
    if (isNaN(num)) {
      return { valid: false, error: 'Amount must be a valid number' };
    }

    if (num <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    if (num > 1e18) {
      return { valid: false, error: 'Amount is too large' };
    }

    return { valid: true, value: num };
  }

  /**
   * Validate network
   */
  validateNetwork(network) {
    const supportedNetworks = ['bscTestnet', 'bscMainnet', 'ethereum', 'polygon'];
    
    if (!network || typeof network !== 'string') {
      return { valid: false, error: 'Network is required and must be a string' };
    }

    if (!supportedNetworks.includes(network)) {
      return { 
        valid: false, 
        error: `Unsupported network. Supported: ${supportedNetworks.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Comprehensive request validation
   */
  validateRequestData(data, requiredFields = []) {
    const errors = [];

    // Check required fields
    requiredFields.forEach(field => {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    });

    // Network-specific validations
    if (data.network) {
      const networkValidation = this.validateNetwork(data.network);
      if (!networkValidation.valid) {
        errors.push(networkValidation.error);
      }
    }

    // Amount validation
    if (data.amount) {
      const amountValidation = this.validateAmount(data.amount);
      if (!amountValidation.valid) {
        errors.push(amountValidation.error);
      }
    }

    // Address validation
    if (data.address) {
      const addressValidation = this.validateEthereumAddress(data.address);
      if (!addressValidation.valid) {
        errors.push(addressValidation.error);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create validation middleware
   */
  createValidationMiddleware() {
    return (request, reply, done) => {
      // Sanitize string inputs
      if (request.body && typeof request.body === 'object') {
        Object.keys(request.body).forEach(key => {
          if (typeof request.body[key] === 'string') {
            request.body[key] = this.sanitizeString(request.body[key]);
          }
        });
      }

      done();
    };
  }
}

export default ValidationManager;