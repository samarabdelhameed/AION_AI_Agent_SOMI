#!/bin/bash

# AION Development Environment Startup Script
# This script starts all required services for development

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MCP_AGENT_PORT=3003
FRONTEND_PORT=5173
HEALTH_CHECK_TIMEOUT=30
RETRY_ATTEMPTS=3

echo -e "${BLUE}🚀 Starting AION Development Environment...${NC}"
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

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local timeout=$3
    
    print_info "Waiting for $service_name to be ready..."
    
    for i in $(seq 1 $timeout); do
        if curl -s -f "$url" >/dev/null 2>&1; then
            print_status "$service_name is ready!"
            return 0
        fi
        
        if [ $((i % 5)) -eq 0 ]; then
            print_info "Still waiting for $service_name... ($i/$timeout)"
        fi
        
        sleep 1
    done
    
    print_error "$service_name failed to start within $timeout seconds"
    return 1
}

# Function to kill process on port
kill_port() {
    local port=$1
    local service_name=$2
    
    if check_port $port; then
        print_warning "$service_name is already running on port $port. Stopping it..."
        local pid=$(lsof -ti:$port)
        if [ ! -z "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            sleep 2
        fi
    fi
}

# Function to validate environment
validate_environment() {
    print_info "Validating development environment..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ to continue."
        exit 1
    fi
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm to continue."
        exit 1
    fi
    
    # Check if required directories exist
    if [ ! -d "mcp_agent" ]; then
        print_error "mcp_agent directory not found. Please run this script from the project root."
        exit 1
    fi
    
    if [ ! -d "frontend" ]; then
        print_error "frontend directory not found. Please run this script from the project root."
        exit 1
    fi
    
    print_status "Environment validation passed"
}

# Function to install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    
    # Install MCP Agent dependencies
    if [ ! -d "mcp_agent/node_modules" ]; then
        print_info "Installing MCP Agent dependencies..."
        cd mcp_agent
        npm install
        cd ..
        print_status "MCP Agent dependencies installed"
    else
        print_info "MCP Agent dependencies already installed"
    fi
    
    # Install Frontend dependencies
    if [ ! -d "frontend/node_modules" ]; then
        print_info "Installing Frontend dependencies..."
        cd frontend
        npm install
        cd ..
        print_status "Frontend dependencies installed"
    else
        print_info "Frontend dependencies already installed"
    fi
}

# Function to setup environment files
setup_environment() {
    print_info "Setting up environment configuration..."
    
    # Create MCP Agent .env if it doesn't exist
    if [ ! -f "mcp_agent/.env" ]; then
        print_info "Creating MCP Agent .env file..."
        cat > mcp_agent/.env << EOF
# MCP Agent Configuration
NODE_ENV=development
PORT=3003
LOG_LEVEL=debug

# Database Configuration (if needed)
# DATABASE_URL=mongodb://localhost:27017/aion_dev

# API Keys (add your keys here)
# COINGECKO_API_KEY=your_api_key_here
# DEFILLAMA_API_KEY=your_api_key_here

# Network Configuration
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# Security
CORS_ORIGIN=http://localhost:5173
EOF
        print_status "MCP Agent .env file created"
    else
        print_info "MCP Agent .env file already exists"
    fi
    
    # Create Frontend .env if it doesn't exist
    if [ ! -f "frontend/.env" ]; then
        print_info "Creating Frontend .env file..."
        cat > frontend/.env << EOF
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

# Contract Addresses
VITE_VAULT_ADDRESS_TESTNET=0x1234567890123456789012345678901234567890
VITE_VAULT_ADDRESS_MAINNET=0x5678901234567890123456789012345678901234

# Development Settings
VITE_DEBUG_MODE=true
VITE_MOCK_DATA=false
EOF
        print_status "Frontend .env file created"
    else
        print_info "Frontend .env file already exists"
    fi
}

# Function to start MCP Agent
start_mcp_agent() {
    print_info "Starting MCP Agent backend..."
    
    # Kill any existing process on the port
    kill_port $MCP_AGENT_PORT "MCP Agent"
    
    # Start MCP Agent in background
    cd mcp_agent
    npm start > ../logs/mcp_agent.log 2>&1 &
    local mcp_pid=$!
    cd ..
    
    # Save PID for cleanup
    echo $mcp_pid > .dev_pids/mcp_agent.pid
    
    # Wait for service to be ready
    if wait_for_service "http://localhost:$MCP_AGENT_PORT/api/health" "MCP Agent" $HEALTH_CHECK_TIMEOUT; then
        print_status "MCP Agent started successfully on port $MCP_AGENT_PORT (PID: $mcp_pid)"
        return 0
    else
        print_error "Failed to start MCP Agent"
        return 1
    fi
}

# Function to start Frontend
start_frontend() {
    print_info "Starting Frontend development server..."
    
    # Kill any existing process on the port
    kill_port $FRONTEND_PORT "Frontend"
    
    # Start Frontend in background
    cd frontend
    npm run dev > ../logs/frontend.log 2>&1 &
    local frontend_pid=$!
    cd ..
    
    # Save PID for cleanup
    echo $frontend_pid > .dev_pids/frontend.pid
    
    # Wait for service to be ready
    if wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend" $HEALTH_CHECK_TIMEOUT; then
        print_status "Frontend started successfully on port $FRONTEND_PORT (PID: $frontend_pid)"
        return 0
    else
        print_error "Failed to start Frontend"
        return 1
    fi
}

# Function to run health checks
run_health_checks() {
    print_info "Running health checks..."
    
    local all_healthy=true
    
    # Check MCP Agent health
    if curl -s -f "http://localhost:$MCP_AGENT_PORT/api/health" >/dev/null 2>&1; then
        print_status "MCP Agent health check passed"
    else
        print_error "MCP Agent health check failed"
        all_healthy=false
    fi
    
    # Check Frontend accessibility
    if curl -s -f "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        print_status "Frontend accessibility check passed"
    else
        print_error "Frontend accessibility check failed"
        all_healthy=false
    fi
    
    if [ "$all_healthy" = true ]; then
        print_status "All health checks passed!"
        return 0
    else
        print_error "Some health checks failed"
        return 1
    fi
}

# Function to create necessary directories
create_directories() {
    mkdir -p logs
    mkdir -p .dev_pids
}

# Function to cleanup on exit
cleanup() {
    print_info "Cleaning up development environment..."
    
    # Kill MCP Agent if running
    if [ -f ".dev_pids/mcp_agent.pid" ]; then
        local mcp_pid=$(cat .dev_pids/mcp_agent.pid)
        if kill -0 $mcp_pid 2>/dev/null; then
            print_info "Stopping MCP Agent (PID: $mcp_pid)..."
            kill $mcp_pid 2>/dev/null || true
        fi
        rm -f .dev_pids/mcp_agent.pid
    fi
    
    # Kill Frontend if running
    if [ -f ".dev_pids/frontend.pid" ]; then
        local frontend_pid=$(cat .dev_pids/frontend.pid)
        if kill -0 $frontend_pid 2>/dev/null; then
            print_info "Stopping Frontend (PID: $frontend_pid)..."
            kill $frontend_pid 2>/dev/null || true
        fi
        rm -f .dev_pids/frontend.pid
    fi
    
    print_info "Cleanup completed"
}

# Function to show status
show_status() {
    echo ""
    echo "=================================================="
    echo -e "${GREEN}🎉 AION Development Environment Started!${NC}"
    echo "=================================================="
    echo ""
    echo -e "${BLUE}📊 Service Status:${NC}"
    echo -e "  • MCP Agent Backend: ${GREEN}http://localhost:$MCP_AGENT_PORT${NC}"
    echo -e "  • Frontend App:      ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
    echo ""
    echo -e "${BLUE}📝 Useful Commands:${NC}"
    echo -e "  • View MCP Agent logs:  ${YELLOW}tail -f logs/mcp_agent.log${NC}"
    echo -e "  • View Frontend logs:   ${YELLOW}tail -f logs/frontend.log${NC}"
    echo -e "  • Stop all services:    ${YELLOW}./scripts/stop-dev.sh${NC}"
    echo -e "  • Health check:         ${YELLOW}./scripts/health-check.sh${NC}"
    echo ""
    echo -e "${BLUE}🔧 Development URLs:${NC}"
    echo -e "  • Main Application:     ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
    echo -e "  • API Health Check:     ${GREEN}http://localhost:$MCP_AGENT_PORT/health${NC}"
    echo -e "  • API Documentation:    ${GREEN}http://localhost:$MCP_AGENT_PORT/docs${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
}

# Main execution
main() {
    # Set up signal handlers for cleanup
    trap cleanup EXIT INT TERM
    
    # Create necessary directories
    create_directories
    
    # Validate environment
    validate_environment
    
    # Install dependencies
    install_dependencies
    
    # Setup environment files
    setup_environment
    
    # Start services
    if start_mcp_agent && start_frontend; then
        # Run health checks
        sleep 3  # Give services a moment to fully start
        if run_health_checks; then
            show_status
            
            # Keep script running and monitor services
            while true; do
                sleep 10
                
                # Check if services are still running
                if [ -f ".dev_pids/mcp_agent.pid" ]; then
                    local mcp_pid=$(cat .dev_pids/mcp_agent.pid)
                    if ! kill -0 $mcp_pid 2>/dev/null; then
                        print_error "MCP Agent has stopped unexpectedly"
                        break
                    fi
                fi
                
                if [ -f ".dev_pids/frontend.pid" ]; then
                    local frontend_pid=$(cat .dev_pids/frontend.pid)
                    if ! kill -0 $frontend_pid 2>/dev/null; then
                        print_error "Frontend has stopped unexpectedly"
                        break
                    fi
                fi
            done
        else
            print_error "Health checks failed. Please check the logs for more information."
            exit 1
        fi
    else
        print_error "Failed to start services. Please check the logs for more information."
        exit 1
    fi
}

# Run main function
main "$@"