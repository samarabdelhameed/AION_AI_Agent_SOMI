#!/bin/bash

# AION Development Environment Stop Script
# This script stops all development services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MCP_AGENT_PORT=3003
FRONTEND_PORT=5173

echo -e "${BLUE}🛑 Stopping AION Development Environment...${NC}"
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

# Function to kill process by PID file
kill_by_pid_file() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            print_info "Stopping $service_name (PID: $pid)..."
            kill $pid 2>/dev/null || true
            
            # Wait for process to stop
            local count=0
            while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # Force kill if still running
            if kill -0 $pid 2>/dev/null; then
                print_warning "Force killing $service_name..."
                kill -9 $pid 2>/dev/null || true
            fi
            
            print_status "$service_name stopped"
        else
            print_info "$service_name was not running"
        fi
        rm -f "$pid_file"
    else
        print_info "No PID file found for $service_name"
    fi
}

# Function to kill process by port
kill_by_port() {
    local port=$1
    local service_name=$2
    
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        print_info "Killing processes on port $port ($service_name)..."
        echo "$pids" | xargs kill -9 2>/dev/null || true
        print_status "Processes on port $port stopped"
    else
        print_info "No processes found on port $port"
    fi
}

# Function to cleanup development files
cleanup_dev_files() {
    print_info "Cleaning up development files..."
    
    # Remove PID files
    rm -rf .dev_pids
    
    # Clean up log files (optional)
    if [ "$1" = "--clean-logs" ]; then
        print_info "Cleaning log files..."
        rm -rf logs
        print_status "Log files cleaned"
    fi
    
    print_status "Development files cleaned up"
}

# Function to show final status
show_final_status() {
    echo ""
    echo "=================================================="
    echo -e "${GREEN}✅ AION Development Environment Stopped${NC}"
    echo "=================================================="
    echo ""
    echo -e "${BLUE}📊 Final Status:${NC}"
    
    # Check if ports are free
    if ! lsof -Pi :$MCP_AGENT_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  • MCP Agent (port $MCP_AGENT_PORT): ${GREEN}Stopped${NC}"
    else
        echo -e "  • MCP Agent (port $MCP_AGENT_PORT): ${RED}Still running${NC}"
    fi
    
    if ! lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  • Frontend (port $FRONTEND_PORT):  ${GREEN}Stopped${NC}"
    else
        echo -e "  • Frontend (port $FRONTEND_PORT):  ${RED}Still running${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🚀 To start again:${NC}"
    echo -e "  ${YELLOW}./scripts/start-dev.sh${NC}"
    echo ""
}

# Main execution
main() {
    print_info "Stopping development services..."
    
    # Stop services by PID files first
    kill_by_pid_file ".dev_pids/mcp_agent.pid" "MCP Agent"
    kill_by_pid_file ".dev_pids/frontend.pid" "Frontend"
    
    # Fallback: kill by port
    kill_by_port $MCP_AGENT_PORT "MCP Agent"
    kill_by_port $FRONTEND_PORT "Frontend"
    
    # Cleanup development files
    cleanup_dev_files "$1"
    
    # Show final status
    show_final_status
}

# Handle command line arguments
case "$1" in
    --clean-logs)
        main --clean-logs
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --clean-logs    Also remove log files"
        echo "  --help, -h      Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0              Stop services only"
        echo "  $0 --clean-logs Stop services and clean logs"
        ;;
    *)
        main
        ;;
esac