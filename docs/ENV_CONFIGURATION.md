# 🔧 AION AI Agent - Environment Configuration

## Quick Setup

Copy this content to your `.env` file:

```bash
# ========================================
# AION AI Agent - Environment Configuration
# ========================================

# Server Configuration
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# ========================================
# Blockchain RPC URLs
# ========================================

# BSC (Binance Smart Chain)
RPC_URL_BSC_TESTNET=https://bsc-testnet.publicnode.com
RPC_URL_BSC_MAINNET=https://bsc-dataseed1.binance.org

# Ethereum
RPC_URL_ETH_SEPOLIA=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
RPC_URL_ETH_MAINNET=https://mainnet.infura.io/v3/YOUR_INFURA_KEY

# Polygon
RPC_URL_POLYGON_AMOY=https://rpc-amoy.polygon.technology
RPC_URL_POLYGON_MAINNET=https://polygon-rpc.com

# ========================================
# Smart Contract Addresses
# ========================================

# AION Vault Contract
AIONVAULT_ADDRESS=0x1234567890123456789012345678901234567890

# Strategy Adapters
STRATEGY_VENUS_ADDRESS=0x1234567890123456789012345678901234567890
STRATEGY_PANCAKE_ADDRESS=0x1234567890123456789012345678901234567890
STRATEGY_AAVE_ADDRESS=0x1234567890123456789012345678901234567890
STRATEGY_BEEFY_ADDRESS=0x1234567890123456789012345678901234567890

# ========================================
# Security & Authentication
# ========================================

# Private Key (FOR TESTING ONLY - Use burner wallet)
PRIVATE_KEY=0x1234567890123456789012345678901234567890123456789012345678901234

# AI Agent Address (should match private key)
AI_AGENT_ADDRESS=0x1234567890123456789012345678901234567890

# ========================================
# External API Keys
# ========================================

# CoinGecko API (for market data)
COINGECKO_API_KEY=your_coingecko_api_key_here

# Infura API Key
INFURA_API_KEY=your_infura_api_key_here

# Alchemy API Key
ALCHEMY_API_KEY=your_alchemy_api_key_here

# ========================================
# Safety & Rate Limiting
# ========================================

# Gas Threshold (in Gwei) - transactions above this will be rejected in safe mode
SAFE_MODE_GAS_THRESHOLD_GWEI=8

# Maximum transaction amount (in BNB equivalent)
MAX_TRANSACTION_AMOUNT_BNB=10

# Rate limiting (requests per minute)
RATE_LIMIT_GENERAL=60
RATE_LIMIT_EXECUTE=10
RATE_LIMIT_PROOF=30

# ========================================
# Frontend & CORS
# ========================================

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Additional allowed origins (comma-separated)
CORS_ORIGINS=http://localhost:4173,http://localhost:5173

# ========================================
# Monitoring & Observability
# ========================================

# Prometheus metrics endpoint
PROMETHEUS_ENABLED=true

# Structured logging
ENABLE_STRUCTURED_LOGGING=true

# Request tracing
ENABLE_REQUEST_TRACING=true

# ========================================
# Cache & Performance
# ========================================

# Redis URL (if using Redis for caching)
REDIS_URL=redis://localhost:6379

# Cache TTL in seconds
CACHE_TTL_MARKET_DATA=30
CACHE_TTL_PROOF_DATA=60

# ========================================
# Development & Debug
# ========================================

# Enable debug mode
DEBUG_MODE=false

# Mock mode (use mock data instead of real blockchain)
MOCK_MODE=false

# Skip RPC health checks
SKIP_RPC_CHECKS=false

# Python bridge timeout (seconds)
PYTHON_BRIDGE_TIMEOUT=30

# ========================================
# Docker & Production
# ========================================

# Docker internal network
DOCKER_NETWORK=aion-ai-agent-network

# Health check interval (seconds)
HEALTH_CHECK_INTERVAL=30

# Graceful shutdown timeout (seconds)
SHUTDOWN_TIMEOUT=10
```

## Important Security Notes

⚠️ **NEVER** commit your actual `.env` file to version control!

- Use a **burner wallet** for `PRIVATE_KEY` in development
- Generate your own API keys for production
- Replace all placeholder addresses with real contract addresses
- Use strong, unique keys for production environments
