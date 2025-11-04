#!/bin/bash

# AION MCP Agent - Real Data Testing Script
# This script runs comprehensive tests to verify real data integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the mcp_agent directory."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ ! -d "node_modules" ]; then
        npm install
        print_success "Dependencies installed"
    else
        print_status "Dependencies already installed, checking for updates..."
        npm install
        print_success "Dependencies updated"
    fi
}

# Function to check environment
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found, creating from example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_warning "Please edit .env file with your configuration before running tests"
        else
            print_error ".env.example not found. Please create .env file manually."
            exit 1
        fi
    fi
    
    # Check if .env has required values
    if grep -q "BSC_RPC_URL" .env; then
        print_success "Environment configuration found"
    else
        print_warning "Environment configuration may be incomplete. Please check .env file."
    fi
}

# Function to run specific test suite
run_test_suite() {
    local suite_name="$1"
    local test_command="$2"
    
    print_status "Running $suite_name tests..."
    echo "----------------------------------------"
    
    if eval "$test_command"; then
        print_success "$suite_name tests passed"
        return 0
    else
        print_error "$suite_name tests failed"
        return 1
    fi
}

# Function to run all real data tests
run_all_real_data_tests() {
    print_status "Starting comprehensive real data testing..."
    echo "========================================"
    
    local overall_success=true
    local test_results=()
    
    # Test 1: Real Data Integration
    if run_test_suite "Real Data Integration" "npm run test:real-data"; then
        test_results+=("✅ Real Data Integration: PASSED")
    else
        test_results+=("❌ Real Data Integration: FAILED")
        overall_success=false
    fi
    
    # Test 2: Smart Contract Validation
    if run_test_suite "Smart Contract Validation" "npm run test:smart-contracts"; then
        test_results+=("✅ Smart Contract Validation: PASSED")
    else
        test_results+=("❌ Smart Contract Validation: FAILED")
        overall_success=false
    fi
    
    # Test 3: Performance Stress Testing
    if run_test_suite "Performance Stress Testing" "npm run test:stress"; then
        test_results+=("✅ Performance Stress Testing: PASSED")
    else
        test_results+=("❌ Performance Stress Testing: FAILED")
        overall_success=false
    fi
    
    # Test 4: Comprehensive Integration
    if run_test_suite "Comprehensive Integration" "npm run test:comprehensive"; then
        test_results+=("✅ Comprehensive Integration: PASSED")
    else
        test_results+=("❌ Comprehensive Integration: FAILED")
        overall_success=false
    fi
    
    # Print summary
    echo "========================================"
    print_status "Test Results Summary:"
    for result in "${test_results[@]}"; do
        echo "  $result"
    done
    
    if [ "$overall_success" = true ]; then
        print_success "All real data tests completed successfully!"
        return 0
    else
        print_error "Some tests failed. Please review the output above."
        return 1
    fi
}

# Function to run quick validation
run_quick_validation() {
    print_status "Running quick validation tests..."
    
    # Quick health check
    if npm run test:real-data -- --testNamePattern="should connect to BSC Testnet successfully" > /dev/null 2>&1; then
        print_success "Quick validation passed - basic connectivity working"
        return 0
    else
        print_error "Quick validation failed - basic connectivity issues"
        return 1
    fi
}

# Function to show help
show_help() {
    echo "AION MCP Agent - Real Data Testing Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -q, --quick         Run quick validation only"
    echo "  -a, --all           Run all real data tests (default)"
    echo "  -c, --check-only    Only check prerequisites and environment"
    echo "  -v, --verbose       Verbose output"
    echo ""
    echo "Examples:"
    echo "  $0                  # Run all tests"
    echo "  $0 --quick          # Run quick validation"
    echo "  $0 --check-only     # Check environment only"
    echo ""
}

# Main execution
main() {
    local quick_mode=false
    local check_only=false
    local verbose=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -q|--quick)
                quick_mode=true
                shift
                ;;
            -a|--all)
                quick_mode=false
                shift
                ;;
            -c|--check-only)
                check_only=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Set verbose mode if requested
    if [ "$verbose" = true ]; then
        set -x
    fi
    
    echo "🚀 AION MCP Agent - Real Data Testing"
    echo "======================================"
    
    # Always check prerequisites
    check_prerequisites
    
    # Install dependencies if needed
    install_dependencies
    
    # Check environment
    check_environment
    
    # Exit if only checking
    if [ "$check_only" = true ]; then
        print_success "Environment check completed successfully"
        exit 0
    fi
    
    # Run tests based on mode
    if [ "$quick_mode" = true ]; then
        print_status "Running in quick validation mode..."
        if run_quick_validation; then
            print_success "Quick validation completed successfully"
            exit 0
        else
            print_error "Quick validation failed"
            exit 1
        fi
    else
        print_status "Running in comprehensive testing mode..."
        if run_all_real_data_tests; then
            print_success "All real data tests completed successfully!"
            exit 0
        else
            print_error "Some tests failed. Please review the output above."
            exit 1
        fi
    fi
}

# Run main function with all arguments
main "$@"
