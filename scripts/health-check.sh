#!/bin/bash

# AION Development Environment Health Check Script
# This script checks the health of all development services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
MCP_AGENT_PORT=3003
FRONTEND_PORT=5173
HEALTH_CHECK_TIMEOUT=10

echo -e "${BLUE}🏥 AION Development Environment Health Check${NC}"
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

print_success() {
    echo -e "${GREEN}🎉 $1${NC}"
}

print_critical() {
    echo -e "${RED}🚨 $1${NC}"
}

# Function to check if service is running on port
check_port_status() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid=$(lsof -ti:$port)
        print_status "$service_name is running on port $port (PID: $pid)"
        return 0
    else
        print_error "$service_name is not running on port $port"
        return 1
    fi
}

# Function to check HTTP endpoint
check_http_endpoint() {
    local url=$1
    local service_name=$2
    local timeout=${3:-$HEALTH_CHECK_TIMEOUT}
    
    print_info "Checking $service_name endpoint: $url"
    
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $timeout "$url" 2>/dev/null || echo "000")
    local curl_exit_code=$?
    
    if [ $curl_exit_code -eq 0 ] && [ "$response_code" -ge 200 ] && [ "$response_code" -lt 400 ]; then
        print_status "$service_name endpoint is healthy (HTTP $response_code)"
        return 0
    else
        if [ $curl_exit_code -eq 28 ]; then
            print_error "$service_name endpoint timed out after ${timeout}s"
        elif [ "$response_code" = "000" ]; then
            print_error "$service_name endpoint is unreachable"
        else
            print_error "$service_name endpoint returned HTTP $response_code"
        fi
        return 1
    fi
}

# Function to check API endpoint with JSON response
check_api_endpoint() {
    local url=$1
    local service_name=$2
    local timeout=${3:-$HEALTH_CHECK_TIMEOUT}
    
    print_info "Checking $service_name API: $url"
    
    local response=$(curl -s --max-time $timeout "$url" 2>/dev/null || echo "")
    local curl_exit_code=$?
    
    if [ $curl_exit_code -eq 0 ] && [ ! -z "$response" ]; then
        # Try to parse JSON response
        if echo "$response" | jq . >/dev/null 2>&1; then
            local status=$(echo "$response" | jq -r '.status // .health // "unknown"' 2>/dev/null || echo "unknown")
            if [ "$status" = "ok" ] || [ "$status" = "healthy" ] || [ "$status" = "up" ]; then
                print_status "$service_name API is healthy"
                return 0
            elif [ "$status" = "degraded" ]; then
                print_warning "$service_name API is running but degraded (some services initializing)"
                return 0  # Consider degraded as acceptable for development
            else
                print_warning "$service_name API responded but status is: $status"
                return 1
            fi
        else
            print_status "$service_name API responded (non-JSON response)"
            return 0
        fi
    else
        if [ $curl_exit_code -eq 28 ]; then
            print_error "$service_name API timed out after ${timeout}s"
        else
            print_error "$service_name API is unreachable"
        fi
        return 1
    fi
}

# Function to check environment variables
check_environment() {
    print_info "Checking environment configuration..."
    
    local env_issues=0
    
    # Check MCP Agent .env
    if [ -f "mcp_agent/.env" ]; then
        print_status "MCP Agent .env file exists"
        
        # Check critical variables
        if grep -q "PORT=" mcp_agent/.env; then
            local port=$(grep "PORT=" mcp_agent/.env | cut -d'=' -f2)
            if [ "$port" = "$MCP_AGENT_PORT" ]; then
                print_status "MCP Agent port configuration is correct ($port)"
            else
                print_warning "MCP Agent port mismatch: expected $MCP_AGENT_PORT, found $port"
                env_issues=$((env_issues + 1))
            fi
        else
            print_warning "PORT not configured in MCP Agent .env"
            env_issues=$((env_issues + 1))
        fi
    else
        print_error "MCP Agent .env file not found"
        env_issues=$((env_issues + 1))
    fi
    
    # Check Frontend .env
    if [ -f "frontend/.env" ]; then
        print_status "Frontend .env file exists"
        
        # Check MCP URL configuration
        if grep -q "VITE_MCP_URL=" frontend/.env; then
            local mcp_url=$(grep "VITE_MCP_URL=" frontend/.env | cut -d'=' -f2)
            local expected_url="http://localhost:$MCP_AGENT_PORT"
            if [ "$mcp_url" = "$expected_url" ]; then
                print_status "Frontend MCP URL configuration is correct"
            else
                print_warning "Frontend MCP URL mismatch: expected $expected_url, found $mcp_url"
                env_issues=$((env_issues + 1))
            fi
        else
            print_warning "VITE_MCP_URL not configured in Frontend .env"
            env_issues=$((env_issues + 1))
        fi
    else
        print_error "Frontend .env file not found"
        env_issues=$((env_issues + 1))
    fi
    
    if [ $env_issues -eq 0 ]; then
        print_status "Environment configuration is healthy"
        return 0
    else
        print_warning "Found $env_issues environment configuration issues"
        return 1
    fi
}

# Function to check dependencies
check_dependencies() {
    print_info "Checking dependencies..."
    
    local dep_issues=0
    
    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        print_status "Node.js is installed: $node_version"
        
        # Check version
        local major_version=$(echo $node_version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$major_version" -ge 18 ]; then
            print_status "Node.js version is compatible (>= 18)"
        else
            print_error "Node.js version is too old. Required: >= 18, Found: $node_version"
            dep_issues=$((dep_issues + 1))
        fi
    else
        print_error "Node.js is not installed"
        dep_issues=$((dep_issues + 1))
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        print_status "npm is installed: v$npm_version"
    else
        print_error "npm is not installed"
        dep_issues=$((dep_issues + 1))
    fi
    
    # Check curl
    if command -v curl &> /dev/null; then
        print_status "curl is available"
    else
        print_warning "curl is not available (needed for health checks)"
        dep_issues=$((dep_issues + 1))
    fi
    
    # Check jq
    if command -v jq &> /dev/null; then
        print_status "jq is available"
    else
        print_warning "jq is not available (JSON parsing will be limited)"
    fi
    
    # Check project dependencies
    if [ -d "mcp_agent/node_modules" ]; then
        print_status "MCP Agent dependencies are installed"
    else
        print_warning "MCP Agent dependencies are not installed"
        dep_issues=$((dep_issues + 1))
    fi
    
    if [ -d "frontend/node_modules" ]; then
        print_status "Frontend dependencies are installed"
    else
        print_warning "Frontend dependencies are not installed"
        dep_issues=$((dep_issues + 1))
    fi
    
    if [ $dep_issues -eq 0 ]; then
        print_status "All dependencies are healthy"
        return 0
    else
        print_warning "Found $dep_issues dependency issues"
        return 1
    fi
}

# Function to check system resources
check_system_resources() {
    print_info "Checking system resources..."
    
    # Check available memory
    if command -v free &> /dev/null; then
        local available_mem=$(free -m | awk 'NR==2{printf "%.1f", $7/1024}')
        print_info "Available memory: ${available_mem}GB"
        
        if (( $(echo "$available_mem > 1.0" | bc -l) )); then
            print_status "Sufficient memory available"
        else
            print_warning "Low memory available: ${available_mem}GB"
        fi
    elif command -v vm_stat &> /dev/null; then
        # macOS
        local free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        local free_gb=$(echo "scale=1; $free_pages * 4096 / 1024 / 1024 / 1024" | bc -l 2>/dev/null || echo "unknown")
        print_info "Available memory: ${free_gb}GB"
    fi
    
    # Check disk space
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 90 ]; then
        print_status "Sufficient disk space (${disk_usage}% used)"
    else
        print_warning "High disk usage: ${disk_usage}%"
    fi
    
    return 0
}

# Function to perform comprehensive health check
comprehensive_health_check() {
    local overall_health=0
    
    echo -e "\n${CYAN}🔍 1. Checking Dependencies${NC}"
    echo "----------------------------------------"
    if ! check_dependencies; then
        overall_health=$((overall_health + 1))
    fi
    
    echo -e "\n${CYAN}🔍 2. Checking Environment Configuration${NC}"
    echo "----------------------------------------"
    if ! check_environment; then
        overall_health=$((overall_health + 1))
    fi
    
    echo -e "\n${CYAN}🔍 3. Checking System Resources${NC}"
    echo "----------------------------------------"
    if ! check_system_resources; then
        overall_health=$((overall_health + 1))
    fi
    
    echo -e "\n${CYAN}🔍 4. Checking Service Status${NC}"
    echo "----------------------------------------"
    local services_running=0
    
    if check_port_status $MCP_AGENT_PORT "MCP Agent"; then
        services_running=$((services_running + 1))
    else
        overall_health=$((overall_health + 1))
    fi
    
    if check_port_status $FRONTEND_PORT "Frontend"; then
        services_running=$((services_running + 1))
    else
        overall_health=$((overall_health + 1))
    fi
    
    echo -e "\n${CYAN}🔍 5. Checking Service Health${NC}"
    echo "----------------------------------------"
    
    if [ $services_running -gt 0 ]; then
        # Check MCP Agent health endpoint
        if lsof -Pi :$MCP_AGENT_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            if ! check_api_endpoint "http://localhost:$MCP_AGENT_PORT/api/health" "MCP Agent"; then
                overall_health=$((overall_health + 1))
            fi
        fi
        
        # Check Frontend accessibility
        if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            if ! check_http_endpoint "http://localhost:$FRONTEND_PORT" "Frontend"; then
                overall_health=$((overall_health + 1))
            fi
        fi
    else
        print_info "No services running, skipping health endpoint checks"
    fi
    
    return $overall_health
}

# Function to show health summary
show_health_summary() {
    local health_score=$1
    
    echo ""
    echo "=================================================="
    
    if [ $health_score -eq 0 ]; then
        print_success "🎉 All Health Checks Passed!"
        echo -e "${GREEN}Your development environment is ready to go!${NC}"
    elif [ $health_score -le 2 ]; then
        print_warning "⚠️  Minor Issues Detected"
        echo -e "${YELLOW}Your development environment has minor issues but should work.${NC}"
    else
        print_critical "🚨 Critical Issues Detected"
        echo -e "${RED}Your development environment has critical issues that need attention.${NC}"
    fi
    
    echo "=================================================="
    echo ""
    
    if [ $health_score -gt 0 ]; then
        echo -e "${BLUE}🔧 Suggested Actions:${NC}"
        
        if [ ! -f "mcp_agent/.env" ] || [ ! -f "frontend/.env" ]; then
            echo -e "  • Run: ${YELLOW}./scripts/start-dev.sh${NC} to create missing .env files"
        fi
        
        if [ ! -d "mcp_agent/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
            echo -e "  • Run: ${YELLOW}npm install${NC} in mcp_agent and frontend directories"
        fi
        
        if ! lsof -Pi :$MCP_AGENT_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "  • Start MCP Agent: ${YELLOW}cd mcp_agent && npm start${NC}"
        fi
        
        if ! lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "  • Start Frontend: ${YELLOW}cd frontend && npm run dev${NC}"
        fi
        
        echo -e "  • Or run: ${YELLOW}./scripts/start-dev.sh${NC} to start everything automatically"
        echo ""
    fi
    
    echo -e "${BLUE}📊 Health Score: ${NC}"
    if [ $health_score -eq 0 ]; then
        echo -e "  ${GREEN}Perfect (0 issues)${NC}"
    else
        echo -e "  ${YELLOW}$health_score issues detected${NC}"
    fi
    echo ""
}

# Main execution
main() {
    case "$1" in
        --quick|-q)
            print_info "Running quick health check..."
            local quick_issues=0
            
            if ! check_port_status $MCP_AGENT_PORT "MCP Agent"; then
                quick_issues=$((quick_issues + 1))
            fi
            
            if ! check_port_status $FRONTEND_PORT "Frontend"; then
                quick_issues=$((quick_issues + 1))
            fi
            
            show_health_summary $quick_issues
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quick, -q     Quick health check (services only)"
            echo "  --help, -h      Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0              Full comprehensive health check"
            echo "  $0 --quick      Quick service status check"
            ;;
        *)
            comprehensive_health_check
            local health_score=$?
            show_health_summary $health_score
            exit $health_score
            ;;
    esac
}

# Run main function
main "$@"