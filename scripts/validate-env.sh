#!/bin/bash

# AION Environment Validation Script
# This script validates all required environment variables and configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 AION Environment Validation${NC}"
echo "=================================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_critical() {
    echo -e "${RED}🚨 $1${NC}"
}

print_success() {
    echo -e "${GREEN}🎉 $1${NC}"
}

# Function to validate environment file
validate_env_file() {
    local env_file=$1
    local service_name=$2
    local required_vars=("${!3}")
    local optional_vars=("${!4}")
    
    echo "Validating $service_name environment ($env_file)..."
    
    local issues=0
    
    if [ ! -f "$env_file" ]; then
        print_error "$env_file not found"
        return 1
    fi
    
    print_status "$env_file exists"
    
    # Check required variables
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" "$env_file"; then
            local value=$(grep "^${var}=" "$env_file" | cut -d'=' -f2- | sed 's/^["'"'"']//' | sed 's/["'"'"']$//')
            if [ ! -z "$value" ] && [ "$value" != "your_api_key_here" ] && [ "$value" != "your_project_id_here" ]; then
                print_status "$var is configured"
            else
                print_warning "$var is not properly configured (placeholder value)"
                issues=$((issues + 1))
            fi
        else
            print_error "$var is missing"
            issues=$((issues + 1))
        fi
    done
    
    # Check optional variables
    for var in "${optional_vars[@]}"; do
        if grep -q "^${var}=" "$env_file"; then
            local value=$(grep "^${var}=" "$env_file" | cut -d'=' -f2- | sed 's/^["'"'"']//' | sed 's/["'"'"']$//')
            if [ ! -z "$value" ] && [ "$value" != "your_api_key_here" ] && [ "$value" != "your_project_id_here" ]; then
                print_status "$var is configured (optional)"
            else
                print_info "$var is not configured (optional)"
            fi
        else
            print_info "$var is not set (optional)"
        fi
    done
    
    return $issues
}

# Function to validate MCP Agent environment
validate_mcp_agent_env() {
    local required_vars=(
        "PORT"
        "AION_NETWORK"
        "RPC_URL_BSC_TESTNET"
        "RPC_URL_BSC_MAINNET"
    )
    
    local optional_vars=(
        "NODE_ENV"
        "LOG_LEVEL"
        "CORS_ORIGIN"
        "MEMBASE_API_KEY"
        "PRIVATE_KEY"
        "PUBLIC_WALLETCONNECT_PROJECT_ID"
    )
    
    validate_env_file "mcp_agent/.env" "MCP Agent" required_vars[@] optional_vars[@]
}

# Function to validate Frontend environment
validate_frontend_env() {
    local required_vars=(
        "VITE_MCP_URL"
        "VITE_WALLET_CONNECT_PROJECT_ID"
    )
    
    local optional_vars=(
        "VITE_APP_NAME"
        "VITE_ENVIRONMENT"
        "VITE_BSC_RPC_URL"
        "VITE_BSC_TESTNET_RPC_URL"
        "VITE_BSC_TEST_RPC"
        "VITE_PRIVY_APP_ID"
        "VITE_BICONOMY_PM"
        "VITE_DEBUG_MODE"
        "VITE_MOCK_DATA"
    )
    
    validate_env_file "frontend/.env" "Frontend" required_vars[@] optional_vars[@]
}

# Function to validate configuration consistency
validate_configuration_consistency() {
    print_info "Validating configuration consistency..."
    
    local issues=0
    
    # Check port consistency
    if [ -f "mcp_agent/.env" ] && [ -f "frontend/.env" ]; then
        local mcp_port=$(grep "^PORT=" mcp_agent/.env 2>/dev/null | cut -d'=' -f2 || echo "")
        local frontend_mcp_url=$(grep "^VITE_MCP_URL=" frontend/.env 2>/dev/null | cut -d'=' -f2 || echo "")
        
        if [ ! -z "$mcp_port" ] && [ ! -z "$frontend_mcp_url" ]; then
            local expected_url="http://localhost:$mcp_port"
            if [ "$frontend_mcp_url" = "$expected_url" ]; then
                print_status "MCP Agent port and Frontend URL are consistent"
            else
                print_error "Port mismatch: MCP Agent port $mcp_port, Frontend URL $frontend_mcp_url"
                issues=$((issues + 1))
            fi
        fi
    fi
    
    # Check RPC URL consistency
    if [ -f "mcp_agent/.env" ] && [ -f "frontend/.env" ]; then
        local mcp_bsc_rpc=$(grep "^BSC_RPC_URL=" mcp_agent/.env 2>/dev/null | cut -d'=' -f2 || echo "")
        local frontend_bsc_rpc=$(grep "^VITE_BSC_RPC_URL=" frontend/.env 2>/dev/null | cut -d'=' -f2 || echo "")
        
        if [ ! -z "$mcp_bsc_rpc" ] && [ ! -z "$frontend_bsc_rpc" ]; then
            if [ "$mcp_bsc_rpc" = "$frontend_bsc_rpc" ]; then
                print_status "BSC RPC URLs are consistent"
            else
                print_warning "BSC RPC URL mismatch between MCP Agent and Frontend"
                issues=$((issues + 1))
            fi
        fi
    fi
    
    return $issues
}

# Function to validate network connectivity
validate_network_connectivity() {
    print_info "Validating network connectivity..."
    
    local issues=0
    
    # Test BSC RPC connectivity
    if [ -f "frontend/.env" ]; then
        local bsc_rpc=$(grep "^VITE_BSC_RPC_URL=" frontend/.env 2>/dev/null | cut -d'=' -f2 || echo "")
        if [ ! -z "$bsc_rpc" ]; then
            print_info "Testing BSC RPC connectivity: $bsc_rpc"
            if curl -s -X POST -H "Content-Type: application/json" \
                --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                --max-time 10 "$bsc_rpc" >/dev/null 2>&1; then
                print_status "BSC RPC is accessible"
            else
                print_warning "BSC RPC is not accessible or slow"
                issues=$((issues + 1))
            fi
        fi
        
        local bsc_testnet_rpc=$(grep "^VITE_BSC_TESTNET_RPC_URL=" frontend/.env 2>/dev/null | cut -d'=' -f2 || echo "")
        if [ ! -z "$bsc_testnet_rpc" ]; then
            print_info "Testing BSC Testnet RPC connectivity: $bsc_testnet_rpc"
            if curl -s -X POST -H "Content-Type: application/json" \
                --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                --max-time 10 "$bsc_testnet_rpc" >/dev/null 2>&1; then
                print_status "BSC Testnet RPC is accessible"
            else
                print_warning "BSC Testnet RPC is not accessible or slow"
                issues=$((issues + 1))
            fi
        fi
    fi
    
    return $issues
}

# Function to validate contract addresses
validate_contract_addresses() {
    print_info "Validating contract addresses..."
    
    local issues=0
    
    if [ -f "frontend/.env" ]; then
        local testnet_vault=$(grep "^VITE_VAULT_ADDRESS_TESTNET=" frontend/.env 2>/dev/null | cut -d'=' -f2 || echo "")
        local mainnet_vault=$(grep "^VITE_VAULT_ADDRESS_MAINNET=" frontend/.env 2>/dev/null | cut -d'=' -f2 || echo "")
        
        # Validate address format (should be 42 characters starting with 0x)
        if [ ! -z "$testnet_vault" ]; then
            if [[ "$testnet_vault" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
                if [ "$testnet_vault" != "0x1234567890123456789012345678901234567890" ]; then
                    print_status "Testnet vault address format is valid"
                else
                    print_warning "Testnet vault address is placeholder"
                    issues=$((issues + 1))
                fi
            else
                print_error "Testnet vault address format is invalid"
                issues=$((issues + 1))
            fi
        fi
        
        if [ ! -z "$mainnet_vault" ]; then
            if [[ "$mainnet_vault" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
                if [ "$mainnet_vault" != "0x5678901234567890123456789012345678901234" ]; then
                    print_status "Mainnet vault address format is valid"
                else
                    print_warning "Mainnet vault address is placeholder"
                    issues=$((issues + 1))
                fi
            else
                print_error "Mainnet vault address format is invalid"
                issues=$((issues + 1))
            fi
        fi
    fi
    
    return $issues
}

# Function to create missing environment files
create_missing_env_files() {
    print_info "Creating missing environment files..."
    
    # Create MCP Agent .env if missing
    if [ ! -f "mcp_agent/.env" ]; then
        print_info "Creating MCP Agent .env file..."
        cat > mcp_agent/.env << 'EOF'
# MCP Agent Configuration
NODE_ENV=development
PORT=3003
LOG_LEVEL=debug

# Database Configuration (optional)
# DATABASE_URL=mongodb://localhost:27017/aion_dev

# API Keys (add your keys here)
# COINGECKO_API_KEY=your_api_key_here
# DEFILLAMA_API_KEY=your_api_key_here

# Network Configuration
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# Security
CORS_ORIGIN=http://localhost:5173

# Optional: Redis for caching
# REDIS_URL=redis://localhost:6379

# Optional: JWT Secret for authentication
# JWT_SECRET=your_jwt_secret_here
EOF
        print_status "MCP Agent .env file created"
    fi
    
    # Create Frontend .env if missing
    if [ ! -f "frontend/.env" ]; then
        print_info "Creating Frontend .env file..."
        cat > frontend/.env << 'EOF'
# Frontend Configuration
VITE_APP_NAME=AION DeFi Platform
VITE_APP_VERSION=1.0.0

# API Configuration
VITE_MCP_URL=http://localhost:3003
VITE_API_TIMEOUT=10000

# Web3 Configuration
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id_here
VITE_BSC_RPC_URL=https://bsc-dataseed.binance.org/
VITE_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# Contract Addresses (update with real addresses)
VITE_VAULT_ADDRESS_TESTNET=0x1234567890123456789012345678901234567890
VITE_VAULT_ADDRESS_MAINNET=0x5678901234567890123456789012345678901234

# Development Settings
VITE_DEBUG_MODE=true
VITE_MOCK_DATA=false

# Optional: Analytics and monitoring
# VITE_ANALYTICS_ID=your_analytics_id_here
# VITE_SENTRY_DSN=your_sentry_dsn_here
EOF
        print_status "Frontend .env file created"
    fi
}

# Function to show validation summary
show_validation_summary() {
    local total_issues=$1
    
    echo ""
    echo "=================================================="
    
    if [ $total_issues -eq 0 ]; then
        print_success "🎉 Environment Validation Passed!"
        echo -e "${GREEN}All environment variables are properly configured.${NC}"
    elif [ $total_issues -le 3 ]; then
        print_warning "⚠️  Minor Configuration Issues"
        echo -e "${YELLOW}Found $total_issues minor issues. The application should still work.${NC}"
    else
        print_critical "🚨 Critical Configuration Issues"
        echo -e "${RED}Found $total_issues critical issues that need attention.${NC}"
    fi
    
    echo "=================================================="
    echo ""
    
    if [ $total_issues -gt 0 ]; then
        echo -e "${BLUE}🔧 Recommended Actions:${NC}"
        echo -e "  1. Review the issues above and update your .env files"
        echo -e "  2. Get a WalletConnect Project ID from ${CYAN}https://cloud.walletconnect.com${NC}"
        echo -e "  3. Update contract addresses with real deployed addresses"
        echo -e "  4. Consider adding API keys for better data sources"
        echo -e "  5. Run this script again to verify fixes"
        echo ""
    fi
    
    echo -e "${BLUE}📁 Environment Files:${NC}"
    echo -e "  • MCP Agent: ${CYAN}mcp_agent/.env${NC}"
    echo -e "  • Frontend:  ${CYAN}frontend/.env${NC}"
    echo ""
    
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo -e "  • Start development: ${YELLOW}./scripts/start-dev.sh${NC}"
    echo -e "  • Health check:      ${YELLOW}./scripts/health-check.sh${NC}"
    echo ""
}

# Main execution
main() {
    case "$1" in
        --create-missing)
            create_missing_env_files
            print_success "Missing environment files created"
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --create-missing    Create missing .env files with defaults"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                  Validate existing environment"
            echo "  $0 --create-missing Create missing .env files"
            ;;
        *)
            local total_issues=0
            
            # Create missing files first
            create_missing_env_files
            
            echo -e "\n${CYAN}🔍 1. Validating MCP Agent Environment${NC}"
            echo "----------------------------------------"
            validate_mcp_agent_env
            local mcp_issues=$?
            total_issues=$((total_issues + mcp_issues))
            
            echo -e "\n${CYAN}🔍 2. Validating Frontend Environment${NC}"
            echo "----------------------------------------"
            validate_frontend_env
            local frontend_issues=$?
            total_issues=$((total_issues + frontend_issues))
            
            echo -e "\n${CYAN}🔍 3. Validating Configuration Consistency${NC}"
            echo "----------------------------------------"
            validate_configuration_consistency
            local consistency_issues=$?
            total_issues=$((total_issues + consistency_issues))
            
            echo -e "\n${CYAN}🔍 4. Validating Contract Addresses${NC}"
            echo "----------------------------------------"
            validate_contract_addresses
            local contract_issues=$?
            total_issues=$((total_issues + contract_issues))
            
            echo -e "\n${CYAN}🔍 5. Validating Network Connectivity${NC}"
            echo "----------------------------------------"
            validate_network_connectivity
            local network_issues=$?
            total_issues=$((total_issues + network_issues))
            
            show_validation_summary $total_issues
            exit $total_issues
            ;;
    esac
}

# Run main function
main "$@"