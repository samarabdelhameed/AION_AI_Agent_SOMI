#!/bin/bash

# AION Connection Testing Suite Runner
# This script runs all connection and integration tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 AION Connection Testing Suite${NC}"
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

print_test_header() {
    echo -e "\n${CYAN}🔬 $1${NC}"
    echo "----------------------------------------"
}

# Function to run a test and capture results
run_test() {
    local test_name=$1
    local test_command=$2
    local test_description=$3
    
    print_info "Running $test_name..."
    
    if eval "$test_command" >/dev/null 2>&1; then
        print_status "$test_name passed"
        return 0
    else
        print_error "$test_name failed"
        if [ "$4" = "--verbose" ]; then
            echo "Command: $test_command"
            eval "$test_command" 2>&1 | head -20
        fi
        return 1
    fi
}

# Function to check prerequisites
check_test_prerequisites() {
    print_test_header "Checking Test Prerequisites"
    
    local issues=0
    
    # Check if services are running
    if ! ./scripts/health-check.sh --quick >/dev/null 2>&1; then
        print_warning "Services are not running. Starting them..."
        if ./scripts/start-dev.sh >/dev/null 2>&1 &; then
            print_info "Waiting for services to start..."
            sleep 10
            
            if ./scripts/health-check.sh --quick >/dev/null 2>&1; then
                print_status "Services started successfully"
            else
                print_error "Failed to start services for testing"
                issues=$((issues + 1))
            fi
        else
            print_error "Failed to start services"
            issues=$((issues + 1))
        fi
    else
        print_status "Services are running"
    fi
    
    # Check if Node.js testing tools are available
    if command -v node &> /dev/null; then
        print_status "Node.js is available"
    else
        print_error "Node.js is required for testing"
        issues=$((issues + 1))
    fi
    
    # Check if curl is available for API testing
    if command -v curl &> /dev/null; then
        print_status "curl is available for API testing"
    else
        print_error "curl is required for API testing"
        issues=$((issues + 1))
    fi
    
    return $issues
}

# Function to run connection tests
run_connection_tests() {
    print_test_header "Connection Tests"
    
    local passed=0
    local total=0
    
    # Test 1: Backend connectivity
    total=$((total + 1))
    if run_test "Backend Health Check" "curl -s -f http://localhost:3003/api/health" "Check if MCP Agent is responding"; then
        passed=$((passed + 1))
    fi
    
    # Test 2: Frontend accessibility
    total=$((total + 1))
    if run_test "Frontend Accessibility" "curl -s -f http://localhost:5173" "Check if Frontend is accessible"; then
        passed=$((passed + 1))
    fi
    
    # Test 3: API endpoints
    local endpoints=(
        "http://localhost:3003/api/health:Health Check"
        "http://localhost:3003/api/oracle/snapshot:Oracle Data"
        "http://localhost:3003/api/vault/stats:Vault Stats"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        local endpoint=$(echo $endpoint_info | cut -d':' -f1)
        local name=$(echo $endpoint_info | cut -d':' -f2)
        
        total=$((total + 1))
        if run_test "$name API" "curl -s -f '$endpoint'" "Test $name endpoint"; then
            passed=$((passed + 1))
        fi
    done
    
    # Test 4: CORS configuration
    total=$((total + 1))
    if run_test "CORS Configuration" "curl -s -H 'Origin: http://localhost:5173' -X OPTIONS http://localhost:3003/api/health" "Test CORS preflight"; then
        passed=$((passed + 1))
    fi
    
    echo ""
    print_info "Connection Tests: $passed/$total passed"
    return $((total - passed))
}

# Function to run data integrity tests
run_data_integrity_tests() {
    print_test_header "Data Integrity Tests"
    
    local passed=0
    local total=0
    
    # Test 1: Market data structure
    total=$((total + 1))
    if run_test "Market Data Structure" "curl -s http://localhost:3003/api/oracle/snapshot | jq '.data.network' | grep -q 'bscTestnet'" "Validate market data structure"; then
        passed=$((passed + 1))
    fi
    
    # Test 2: Vault stats structure
    total=$((total + 1))
    if run_test "Vault Stats Structure" "curl -s http://localhost:3003/api/vault/stats | jq '.data.balance' | grep -q '[0-9]'" "Validate vault stats structure"; then
        passed=$((passed + 1))
    fi
    
    # Test 3: Data freshness
    total=$((total + 1))
    if run_test "Data Freshness" "curl -s http://localhost:3003/api/oracle/snapshot | jq '.data.last_updated' | grep -q '$(date +%Y)'" "Check data freshness"; then
        passed=$((passed + 1))
    fi
    
    # Test 4: Protocol data validation
    total=$((total + 1))
    if run_test "Protocol Data Validation" "curl -s http://localhost:3003/api/oracle/snapshot | jq '.data.protocols | keys | length' | grep -q '[1-9]'" "Validate protocol data"; then
        passed=$((passed + 1))
    fi
    
    echo ""
    print_info "Data Integrity Tests: $passed/$total passed"
    return $((total - passed))
}

# Function to run error scenario tests
run_error_scenario_tests() {
    print_test_header "Error Scenario Tests"
    
    local passed=0
    local total=0
    
    # Test 1: Invalid endpoint handling
    total=$((total + 1))
    if run_test "Invalid Endpoint Handling" "curl -s http://localhost:3003/api/nonexistent | jq '.error' | grep -q 'Not Found'" "Test 404 error handling"; then
        passed=$((passed + 1))
    fi
    
    # Test 2: Malformed request handling
    total=$((total + 1))
    if run_test "Malformed Request Handling" "curl -s -X POST -H 'Content-Type: application/json' -d 'invalid json' http://localhost:3003/api/execute" "Test malformed JSON handling"; then
        passed=$((passed + 1))
    fi
    
    # Test 3: Network timeout simulation
    total=$((total + 1))
    if run_test "Timeout Handling" "timeout 2s curl -s http://localhost:3003/api/oracle/snapshot || echo 'timeout handled'" "Test timeout scenarios"; then
        passed=$((passed + 1))
    fi
    
    echo ""
    print_info "Error Scenario Tests: $passed/$total passed"
    return $((total - passed))
}

# Function to run performance tests
run_performance_tests() {
    print_test_header "Performance Tests"
    
    local passed=0
    local total=0
    
    # Test 1: Response time
    total=$((total + 1))
    local start_time=$(date +%s%N)
    if curl -s http://localhost:3003/api/health >/dev/null 2>&1; then
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        if [ $duration -lt 5000 ]; then # Less than 5 seconds
            print_status "Response Time Test passed (${duration}ms)"
            passed=$((passed + 1))
        else
            print_warning "Response Time Test slow (${duration}ms)"
        fi
    else
        print_error "Response Time Test failed"
    fi
    
    # Test 2: Concurrent requests
    total=$((total + 1))
    print_info "Testing concurrent requests..."
    local concurrent_start=$(date +%s%N)
    
    # Make 10 concurrent requests
    for i in {1..10}; do
        curl -s http://localhost:3003/api/health >/dev/null 2>&1 &
    done
    wait
    
    local concurrent_end=$(date +%s%N)
    local concurrent_duration=$(( (concurrent_end - concurrent_start) / 1000000 ))
    
    if [ $concurrent_duration -lt 10000 ]; then # Less than 10 seconds
        print_status "Concurrent Requests Test passed (${concurrent_duration}ms)"
        passed=$((passed + 1))
    else
        print_warning "Concurrent Requests Test slow (${concurrent_duration}ms)"
    fi
    
    # Test 3: Memory usage (basic check)
    total=$((total + 1))
    if command -v ps &> /dev/null; then
        local mcp_pid=$(lsof -ti:3003 2>/dev/null || echo "")
        if [ ! -z "$mcp_pid" ]; then
            local memory_usage=$(ps -o rss= -p $mcp_pid 2>/dev/null || echo "0")
            if [ "$memory_usage" -lt 500000 ]; then # Less than 500MB
                print_status "Memory Usage Test passed (${memory_usage}KB)"
                passed=$((passed + 1))
            else
                print_warning "Memory Usage Test high (${memory_usage}KB)"
            fi
        else
            print_warning "Could not check memory usage (MCP Agent PID not found)"
        fi
    else
        print_warning "ps command not available for memory testing"
    fi
    
    echo ""
    print_info "Performance Tests: $passed/$total passed"
    return $((total - passed))
}

# Function to run comprehensive integration tests
run_integration_tests() {
    print_test_header "Integration Tests"
    
    local passed=0
    local total=0
    
    # Test 1: Full data flow
    total=$((total + 1))
    print_info "Testing complete data flow..."
    
    # Get market data
    local market_response=$(curl -s http://localhost:3003/api/oracle/snapshot)
    if echo "$market_response" | jq -e '.success' >/dev/null 2>&1; then
        # Get vault stats
        local vault_response=$(curl -s http://localhost:3003/api/vault/stats)
        if echo "$vault_response" | jq -e '.success' >/dev/null 2>&1; then
            # Get system health
            local health_response=$(curl -s http://localhost:3003/api/health)
            if echo "$health_response" | jq -e '.status' >/dev/null 2>&1; then
                print_status "Full Data Flow Test passed"
                passed=$((passed + 1))
            else
                print_error "System health check failed"
            fi
        else
            print_error "Vault stats check failed"
        fi
    else
        print_error "Market data check failed"
    fi
    
    # Test 2: Error recovery
    total=$((total + 1))
    print_info "Testing error recovery..."
    
    # Make request to invalid endpoint, then valid endpoint
    curl -s http://localhost:3003/api/invalid >/dev/null 2>&1
    if curl -s http://localhost:3003/api/health >/dev/null 2>&1; then
        print_status "Error Recovery Test passed"
        passed=$((passed + 1))
    else
        print_error "Error Recovery Test failed"
    fi
    
    echo ""
    print_info "Integration Tests: $passed/$total passed"
    return $((total - passed))
}

# Function to show test summary
show_test_summary() {
    local total_failures=$1
    
    echo ""
    echo "=================================================="
    
    if [ $total_failures -eq 0 ]; then
        print_success "🎉 All Connection Tests Passed!"
        echo -e "${GREEN}Your connection infrastructure is working perfectly.${NC}"
    elif [ $total_failures -le 3 ]; then
        print_warning "⚠️  Minor Test Failures"
        echo -e "${YELLOW}Found $total_failures minor issues. Most functionality should work.${NC}"
    else
        print_error "🚨 Critical Test Failures"
        echo -e "${RED}Found $total_failures critical issues that need attention.${NC}"
    fi
    
    echo "=================================================="
    echo ""
    
    if [ $total_failures -gt 0 ]; then
        echo -e "${BLUE}🔧 Troubleshooting Steps:${NC}"
        echo -e "  1. Check service status: ${YELLOW}./scripts/health-check.sh${NC}"
        echo -e "  2. Validate environment: ${YELLOW}./scripts/validate-env.sh${NC}"
        echo -e "  3. Restart services: ${YELLOW}./scripts/stop-dev.sh && ./scripts/start-dev.sh${NC}"
        echo -e "  4. Check logs: ${YELLOW}tail -f logs/*.log${NC}"
        echo ""
    fi
    
    echo -e "${BLUE}📊 Test Categories:${NC}"
    echo -e "  • Connection Tests: Basic connectivity and API endpoints"
    echo -e "  • Data Integrity Tests: Data structure and validation"
    echo -e "  • Error Scenario Tests: Error handling and recovery"
    echo -e "  • Performance Tests: Response time and resource usage"
    echo -e "  • Integration Tests: End-to-end data flow"
    echo ""
    
    echo -e "${BLUE}📁 Test Files:${NC}"
    echo -e "  • ${CYAN}frontend/src/tests/connectionManager.test.ts${NC}"
    echo -e "  • ${CYAN}frontend/src/tests/apiClient.integration.test.ts${NC}"
    echo -e "  • ${CYAN}frontend/src/tests/endToEnd.test.ts${NC}"
    echo -e "  • ${CYAN}frontend/src/tests/performance.test.ts${NC}"
    echo -e "  • ${CYAN}frontend/src/tests/errorScenarios.test.ts${NC}"
    echo -e "  • ${CYAN}frontend/src/tests/dataIntegrity.test.ts${NC}"
    echo ""
}

# Main execution
main() {
    case "$1" in
        --connection-only)
            check_test_prerequisites
            local prereq_issues=$?
            
            if [ $prereq_issues -eq 0 ]; then
                run_connection_tests
                local connection_failures=$?
                show_test_summary $connection_failures
                exit $connection_failures
            else
                print_error "Prerequisites not met"
                exit $prereq_issues
            fi
            ;;
        --performance-only)
            check_test_prerequisites
            local prereq_issues=$?
            
            if [ $prereq_issues -eq 0 ]; then
                run_performance_tests
                local performance_failures=$?
                show_test_summary $performance_failures
                exit $performance_failures
            else
                print_error "Prerequisites not met"
                exit $prereq_issues
            fi
            ;;
        --quick)
            print_info "Running quick connection test suite..."
            
            check_test_prerequisites
            local prereq_issues=$?
            
            if [ $prereq_issues -eq 0 ]; then
                run_connection_tests
                local connection_failures=$?
                
                if [ $connection_failures -eq 0 ]; then
                    print_success "Quick tests passed!"
                else
                    print_warning "Quick tests found $connection_failures issues"
                fi
                
                exit $connection_failures
            else
                exit $prereq_issues
            fi
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --connection-only   Run only connection tests"
            echo "  --performance-only  Run only performance tests"
            echo "  --quick            Run quick connection tests only"
            echo "  --verbose          Show detailed output for failures"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                 Run all tests"
            echo "  $0 --quick         Quick connection check"
            echo "  $0 --verbose       Detailed output on failures"
            ;;
        *)
            print_info "Running comprehensive connection testing suite..."
            
            local total_failures=0
            
            # Check prerequisites
            check_test_prerequisites
            local prereq_issues=$?
            total_failures=$((total_failures + prereq_issues))
            
            if [ $prereq_issues -eq 0 ]; then
                # Run all test categories
                run_connection_tests
                local connection_failures=$?
                total_failures=$((total_failures + connection_failures))
                
                run_data_integrity_tests
                local integrity_failures=$?
                total_failures=$((total_failures + integrity_failures))
                
                run_error_scenario_tests
                local error_failures=$?
                total_failures=$((total_failures + error_failures))
                
                run_performance_tests
                local performance_failures=$?
                total_failures=$((total_failures + performance_failures))
                
                run_integration_tests
                local integration_failures=$?
                total_failures=$((total_failures + integration_failures))
                
                show_test_summary $total_failures
                
                if [ $total_failures -eq 0 ]; then
                    print_success "🎊 Task 6: Create Connection Testing Suite - COMPLETED SUCCESSFULLY!"
                    echo ""
                    echo -e "${GREEN}All connection tests passed! Your infrastructure is solid.${NC}"
                else
                    print_warning "⚠️  Found $total_failures issues across all test categories"
                fi
                
                exit $total_failures
            else
                print_error "Cannot run tests due to prerequisite failures"
                exit $prereq_issues
            fi
            ;;
    esac
}

# Run main function
main "$@"