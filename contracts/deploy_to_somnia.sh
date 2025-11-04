#!/bin/bash

# 🚀 AION Vault - Automated Deployment to Somnia Testnet
# Author: AION Team
# For: Somnia AI Hackathon

set -e

echo "=========================================="
echo "🚀 AION Vault Somnia Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo ""
    echo "Creating .env template..."
    cat > .env << 'EOF'
# Your Private Key (DO NOT COMMIT THIS!)
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE

# Somnia Testnet RPC
SOMNIA_RPC_URL=https://dream-rpc.somnia.network

# Deployment Configuration
MIN_DEPOSIT=1000000000000000
MIN_YIELD_CLAIM=100000000000000
EOF
    echo -e "${YELLOW}⚠️  Please edit .env file and add your PRIVATE_KEY${NC}"
    exit 1
fi

# Load environment variables
source .env

# Check if private key is set
if [ "$PRIVATE_KEY" == "YOUR_PRIVATE_KEY_HERE" ]; then
    echo -e "${RED}❌ Error: Please set your PRIVATE_KEY in .env file${NC}"
    exit 1
fi

# Somnia Testnet Configuration
SOMNIA_RPC="https://dream-rpc.somnia.network"
CHAIN_ID="50311"
DEPLOYER="0xdafee25f98ff62504c1086eacbb406190f3110d5"

echo -e "${GREEN}📋 Deployment Configuration${NC}"
echo "  RPC URL: $SOMNIA_RPC"
echo "  Chain ID: $CHAIN_ID"
echo "  Deployer: $DEPLOYER"
echo ""

# Check foundry installation
if ! command -v forge &> /dev/null; then
    echo -e "${RED}❌ Foundry not installed!${NC}"
    echo "Please install Foundry: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
fi

echo -e "${GREEN}✅ Foundry found: $(forge --version | head -n 1)${NC}"
echo ""

# Check balance
echo -e "${YELLOW}🔍 Checking wallet balance...${NC}"
BALANCE=$(cast balance $DEPLOYER --rpc-url $SOMNIA_RPC)
echo "  Balance: $BALANCE wei"

if [ "$BALANCE" == "0" ]; then
    echo -e "${RED}❌ Insufficient balance!${NC}"
    echo "  Get test tokens from: https://faucet.somnia.network"
    exit 1
fi

echo -e "${GREEN}✅ Balance sufficient${NC}"
echo ""

# Compile contracts
echo -e "${YELLOW}🔨 Compiling contracts...${NC}"
forge build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Compilation failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Compilation successful${NC}"
echo ""

# Deploy contracts
echo -e "${YELLOW}🚀 Deploying contracts to Somnia Testnet...${NC}"
echo ""

forge script script/DeploySomniaAgent.s.sol:DeploySomniaAgent \
  --rpc-url $SOMNIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --legacy \
  -vvvv

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""

# Check if deployment file exists
DEPLOYMENT_FILE="./deployments/somnia-${CHAIN_ID}.json"

if [ -f "$DEPLOYMENT_FILE" ]; then
    echo -e "${GREEN}📄 Deployment addresses saved to: $DEPLOYMENT_FILE${NC}"
    echo ""
    
    # Parse and display addresses
    if command -v jq &> /dev/null; then
        VAULT_ADDRESS=$(jq -r '.vault' $DEPLOYMENT_FILE)
        AI_ADDRESS=$(jq -r '.somniaAI' $DEPLOYMENT_FILE)
        AGENT_ADDRESS=$(jq -r '.agent' $DEPLOYMENT_FILE)
        
        echo "=========================================="
        echo "📋 Deployed Contract Addresses"
        echo "=========================================="
        echo "AION Vault:    $VAULT_ADDRESS"
        echo "Somnia AI:     $AI_ADDRESS"
        echo "Somnia Agent:  $AGENT_ADDRESS"
        echo ""
    fi
fi

# Print next steps
echo "=========================================="
echo "🎯 Next Steps"
echo "=========================================="
echo ""
echo "1. 🔍 Verify contracts on block explorer:"
echo "   https://somnia-devnet.socialscan.io"
echo ""
echo "2. 🧪 Test the deployment:"
echo "   ./test_deployment.sh"
echo ""
echo "3. 📝 Update your README with contract addresses"
echo ""
echo "4. 🎬 Create demo video for hackathon"
echo ""
echo "5. 📤 Submit to Somnia AI Hackathon"
echo ""
echo "=========================================="
echo -e "${GREEN}✨ Deployment Complete! Good Luck! 🚀${NC}"
echo "=========================================="

