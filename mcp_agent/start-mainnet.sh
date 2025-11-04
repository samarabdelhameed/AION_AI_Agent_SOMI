#!/bin/bash

# ==============================================
# AION MCP Agent - Mainnet Startup Script
# ==============================================

echo "🚀 Starting AION MCP Agent with Mainnet Integration..."
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with mainnet configuration."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set environment to production for mainnet
export NODE_ENV=production

# Start the server
echo "🌐 Starting server with mainnet configuration..."
echo "📍 Default network: BSC Mainnet"
echo "🔗 Server will be available at: http://localhost:3003"
echo ""

# Start with mainnet configuration
npm start

echo ""
echo "🎉 AION MCP Agent started successfully!"
echo "📊 Mainnet integration is active"
echo "🔗 API endpoints available at http://localhost:3003"
