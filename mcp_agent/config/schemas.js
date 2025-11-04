/**
 * @fileoverview Configuration Validation Schemas
 * @description JSON schemas for validating configuration sections
 */

export const configSchemas = {
  server: {
    type: 'object',
    required: ['port', 'host'],
    properties: {
      port: {
        type: 'number',
        min: 1,
        max: 65535
      },
      host: {
        type: 'string',
        minLength: 1
      },
      timeout: {
        type: 'number',
        min: 1000,
        max: 300000
      },
      cors: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          origins: {
            type: 'array',
            items: { type: 'string' }
          },
          credentials: { type: 'boolean' }
        }
      }
    }
  },

  database: {
    type: 'object',
    required: ['host', 'port', 'name'],
    properties: {
      host: {
        type: 'string',
        minLength: 1
      },
      port: {
        type: 'number',
        min: 1,
        max: 65535
      },
      name: {
        type: 'string',
        minLength: 1
      },
      username: {
        type: 'string',
        minLength: 1
      },
      password: {
        type: 'string'
      },
      ssl: {
        type: 'boolean'
      },
      pool: {
        type: 'object',
        properties: {
          min: {
            type: 'number',
            min: 0,
            max: 100
          },
          max: {
            type: 'number',
            min: 1,
            max: 1000
          },
          acquireTimeoutMillis: {
            type: 'number',
            min: 1000
          },
          idleTimeoutMillis: {
            type: 'number',
            min: 1000
          }
        }
      }
    }
  },

  cache: {
    type: 'object',
    required: ['provider', 'ttl'],
    properties: {
      provider: {
        type: 'string',
        enum: ['memory', 'redis']
      },
      ttl: {
        type: 'number',
        min: 1000,
        max: 86400000 // 24 hours
      },
      maxSize: {
        type: 'number',
        min: 10,
        max: 1000000
      },
      redis: {
        type: 'object',
        properties: {
          host: { type: 'string', minLength: 1 },
          port: { type: 'number', min: 1, max: 65535 },
          db: { type: 'number', min: 0, max: 15 }
        }
      }
    }
  },

  security: {
    type: 'object',
    required: ['jwtSecret', 'bcryptRounds'],
    properties: {
      jwtSecret: {
        type: 'string',
        minLength: 32
      },
      jwtExpiresIn: {
        type: 'string',
        minLength: 1
      },
      bcryptRounds: {
        type: 'number',
        min: 8,
        max: 15
      },
      rateLimitWindow: {
        type: 'number',
        min: 1000,
        max: 3600000
      },
      rateLimitMax: {
        type: 'number',
        min: 1,
        max: 10000
      },
      corsOrigins: {
        type: 'array',
        items: { type: 'string' }
      },
      trustedProxies: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  },

  logging: {
    type: 'object',
    required: ['level'],
    properties: {
      level: {
        type: 'string',
        enum: ['error', 'warn', 'info', 'debug', 'trace']
      },
      format: {
        type: 'string',
        enum: ['json', 'text', 'simple']
      },
      file: {
        type: 'string',
        minLength: 1
      },
      console: {
        type: 'boolean'
      },
      maxFiles: {
        type: 'number',
        min: 1,
        max: 100
      },
      maxSize: {
        type: 'string'
      }
    }
  },

  blockchain: {
    type: 'object',
    required: ['networks', 'defaultNetwork'],
    properties: {
      networks: {
        type: 'object',
        properties: {
          bscTestnet: {
            type: 'object',
            required: ['rpc', 'chainId'],
            properties: {
              rpc: { type: 'string', minLength: 1 },
              chainId: { type: 'number', min: 1 },
              gasPrice: { type: 'string' },
              gasLimit: { type: 'string' }
            }
          },
          bscMainnet: {
            type: 'object',
            required: ['rpc', 'chainId'],
            properties: {
              rpc: { type: 'string', minLength: 1 },
              chainId: { type: 'number', min: 1 },
              gasPrice: { type: 'string' },
              gasLimit: { type: 'string' }
            }
          }
        }
      },
      defaultNetwork: {
        type: 'string',
        enum: ['bscTestnet', 'bscMainnet']
      },
      retryAttempts: {
        type: 'number',
        min: 1,
        max: 10
      },
      retryDelay: {
        type: 'number',
        min: 100,
        max: 10000
      }
    }
  },

  oracle: {
    type: 'object',
    required: ['dataSources', 'cacheTimeout'],
    properties: {
      dataSources: {
        type: 'object',
        properties: {
          coingecko: {
            type: 'object',
            required: ['baseUrl', 'rateLimit', 'timeout'],
            properties: {
              baseUrl: { type: 'string', minLength: 1 },
              rateLimit: { type: 'number', min: 1, max: 10000 },
              timeout: { type: 'number', min: 1000, max: 60000 }
            }
          },
          binance: {
            type: 'object',
            required: ['baseUrl', 'rateLimit', 'timeout'],
            properties: {
              baseUrl: { type: 'string', minLength: 1 },
              rateLimit: { type: 'number', min: 1, max: 10000 },
              timeout: { type: 'number', min: 1000, max: 60000 }
            }
          },
          defillama: {
            type: 'object',
            required: ['baseUrl', 'rateLimit', 'timeout'],
            properties: {
              baseUrl: { type: 'string', minLength: 1 },
              rateLimit: { type: 'number', min: 1, max: 10000 },
              timeout: { type: 'number', min: 1000, max: 60000 }
            }
          }
        }
      },
      cacheTimeout: {
        type: 'number',
        min: 1000,
        max: 3600000
      },
      fallbackEnabled: {
        type: 'boolean'
      }
    }
  },

  mcp: {
    type: 'object',
    required: ['serverPort'],
    properties: {
      serverPort: {
        type: 'number',
        min: 1,
        max: 65535
      },
      maxConnections: {
        type: 'number',
        min: 1,
        max: 10000
      },
      heartbeatInterval: {
        type: 'number',
        min: 1000,
        max: 300000
      },
      requestTimeout: {
        type: 'number',
        min: 1000,
        max: 300000
      }
    }
  }
};

export default configSchemas;