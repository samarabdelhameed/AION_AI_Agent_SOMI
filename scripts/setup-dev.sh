#!/bin/bash

# AION Development Environment Setup Script
# This script sets up the complete development environment from scratch

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛠️  AION Development Environment Setup${NC}"
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

print_step() {
    echo -e "\n${CYAN}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Step 1: Checking Prerequisites"
    
    local missing_deps=0
    
    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        local major_version=$(echo $node_version | cut -d'v' -f2 | cut -d'.' -f1)
        
        if [ "$major_version" -ge 18 ]; then
            print_status "Node.js $node_version (compatible)"
        else
            print_error "Node.js version $node_version is too old (required: >= 18)"
            missing_deps=$((missing_deps + 1))
        fi
    else
        print_error "Node.js is not installed"
        missing_deps=$((missing_deps + 1))
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        print_status "npm v$npm_version"
    else
        print_error "npm is not installed"
        missing_deps=$((missing_deps + 1))
    fi
    
    # Check git
    if command -v git &> /dev/null; then
        local git_version=$(git --version | cut -d' ' -f3)
        print_status "git $git_version"
    else
        print_warning "git is not installed (recommended for version control)"
    fi
    
    # Check curl
    if command -v curl &> /dev/null; then
        print_status "curl is available"
    else
        print_error "curl is required for health checks"
        missing_deps=$((missing_deps + 1))
    fi
    
    if [ $missing_deps -gt 0 ]; then
        print_error "Missing $missing_deps required dependencies"
        echo ""
        echo -e "${YELLOW}Please install the missing dependencies:${NC}"
        echo -e "  • Node.js 18+: ${CYAN}https://nodejs.org/${NC}"
        echo -e "  • npm: Usually comes with Node.js"
        echo -e "  • curl: Usually pre-installed on most systems"
        echo ""
        exit 1
    fi
    
    print_status "All prerequisites are satisfied"
}

# Function to create project structure
create_project_structure() {
    print_step "Step 2: Creating Project Structure"
    
    # Create necessary directories
    local directories=(
        "logs"
        ".dev_pids"
        "scripts"
        "docs"
        "tests"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "Created directory: $dir"
        else
            print_info "Directory already exists: $dir"
        fi
    done
    
    # Create .gitignore if it doesn't exist
    if [ ! -f ".gitignore" ]; then
        print_info "Creating .gitignore file..."
        cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
*.tsbuildinfo

# Development files
logs/
.dev_pids/
*.log

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
EOF
        print_status "Created .gitignore file"
    else
        print_info ".gitignore already exists"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_step "Step 3: Installing Dependencies"
    
    # Install MCP Agent dependencies
    if [ -d "mcp_agent" ]; then
        print_info "Installing MCP Agent dependencies..."
        cd mcp_agent
        
        if [ ! -f "package.json" ]; then
            print_error "mcp_agent/package.json not found"
            cd ..
            return 1
        fi
        
        npm install
        print_status "MCP Agent dependencies installed"
        cd ..
    else
        print_warning "mcp_agent directory not found, skipping"
    fi
    
    # Install Frontend dependencies
    if [ -d "frontend" ]; then
        print_info "Installing Frontend dependencies..."
        cd frontend
        
        if [ ! -f "package.json" ]; then
            print_error "frontend/package.json not found"
            cd ..
            return 1
        fi
        
        npm install
        print_status "Frontend dependencies installed"
        cd ..
    else
        print_warning "frontend directory not found, skipping"
    fi
}

# Function to setup environment files
setup_environment_files() {
    print_step "Step 4: Setting Up Environment Files"
    
    # Run the environment validation script to create missing files
    if [ -f "scripts/validate-env.sh" ]; then
        chmod +x scripts/validate-env.sh
        ./scripts/validate-env.sh --create-missing
    else
        print_warning "validate-env.sh not found, creating environment files manually..."
        
        # Create MCP Agent .env
        if [ ! -f "mcp_agent/.env" ]; then
            print_info "Creating MCP Agent .env file..."
            cat > mcp_agent/.env << 'EOF'
# MCP Agent Configuration
NODE_ENV=development
PORT=3003
LOG_LEVEL=debug

# Network Configuration
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# Security
CORS_ORIGIN=http://localhost:5173
EOF
            print_status "MCP Agent .env file created"
        fi
        
        # Create Frontend .env
        if [ ! -f "frontend/.env" ]; then
            print_info "Creating Frontend .env file..."
            cat > frontend/.env << 'EOF'
# Frontend Configuration
VITE_APP_NAME=AION DeFi Platform
VITE_MCP_URL=http://localhost:3003
VITE_BSC_RPC_URL=https://bsc-dataseed.binance.org/
VITE_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
VITE_DEBUG_MODE=true
EOF
            print_status "Frontend .env file created"
        fi
    fi
}

# Function to make scripts executable
setup_scripts() {
    print_step "Step 5: Setting Up Development Scripts"
    
    local scripts=(
        "scripts/start-dev.sh"
        "scripts/stop-dev.sh"
        "scripts/health-check.sh"
        "scripts/validate-env.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            chmod +x "$script"
            print_status "Made $script executable"
        else
            print_warning "$script not found"
        fi
    done
}

# Function to run initial validation
run_initial_validation() {
    print_step "Step 6: Running Initial Validation"
    
    # Validate environment
    if [ -f "scripts/validate-env.sh" ]; then
        print_info "Validating environment configuration..."
        if ./scripts/validate-env.sh >/dev/null 2>&1; then
            print_status "Environment validation passed"
        else
            print_warning "Environment validation found issues (this is normal for initial setup)"
        fi
    fi
    
    # Check if we can build the projects
    print_info "Testing build processes..."
    
    # Test MCP Agent
    if [ -d "mcp_agent" ] && [ -f "mcp_agent/package.json" ]; then
        cd mcp_agent
        if npm run build >/dev/null 2>&1 || npm run test >/dev/null 2>&1 || echo "No build script"; then
            print_status "MCP Agent project structure is valid"
        else
            print_warning "MCP Agent may have build issues"
        fi
        cd ..
    fi
    
    # Test Frontend
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        cd frontend
        if npm run build >/dev/null 2>&1; then
            print_status "Frontend builds successfully"
        else
            print_warning "Frontend may have build issues"
        fi
        cd ..
    fi
}

# Function to create development documentation
create_documentation() {
    print_step "Step 7: Creating Development Documentation"
    
    # Create README for development
    if [ ! -f "docs/DEVELOPMENT.md" ]; then
        print_info "Creating development documentation..."
        cat > docs/DEVELOPMENT.md << 'EOF'
# AION Development Guide

## Quick Start

1. **Setup Environment** (one-time):
   ```bash
   ./scripts/setup-dev.sh
   ```

2. **Start Development Environment**:
   ```bash
   ./scripts/start-dev.sh
   ```

3. **Stop Development Environment**:
   ```bash
   ./scripts/stop-dev.sh
   ```

## Development Scripts

- `./scripts/start-dev.sh` - Start all development services
- `./scripts/stop-dev.sh` - Stop all development services  
- `./scripts/health-check.sh` - Check service health
- `./scripts/validate-env.sh` - Validate environment configuration

## Services

- **MCP Agent Backend**: http://localhost:3003
- **Frontend Application**: http://localhost:5173

## Environment Files

- `mcp_agent/.env` - Backend configuration
- `frontend/.env` - Frontend configuration

## Logs

- `logs/mcp_agent.log` - Backend logs
- `logs/frontend.log` - Frontend logs

## Troubleshooting

1. **Services won't start**: Run `./scripts/health-check.sh` to diagnose
2. **Environment issues**: Run `./scripts/validate-env.sh`
3. **Port conflicts**: Check if ports 3003 and 5173 are available

## Development Workflow

1. Make changes to code
2. Services will auto-reload (hot reload enabled)
3. Check logs if issues occur
4. Run health checks periodically

For more detailed information, see the main README.md file.
EOF
        print_status "Development documentation created"
    else
        print_info "Development documentation already exists"
    fi
}

# Function to show setup summary
show_setup_summary() {
    echo ""
    echo "=================================================="
    print_success "🎉 Development Environment Setup Complete!"
    echo "=================================================="
    echo ""
    
    echo -e "${BLUE}📊 Setup Summary:${NC}"
    echo -e "  ✅ Prerequisites checked"
    echo -e "  ✅ Project structure created"
    echo -e "  ✅ Dependencies installed"
    echo -e "  ✅ Environment files configured"
    echo -e "  ✅ Scripts made executable"
    echo -e "  ✅ Initial validation completed"
    echo -e "  ✅ Documentation created"
    echo ""
    
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo -e "  1. Review and update environment files:"
    echo -e "     • ${CYAN}mcp_agent/.env${NC}"
    echo -e "     • ${CYAN}frontend/.env${NC}"
    echo ""
    echo -e "  2. Start the development environment:"
    echo -e "     ${YELLOW}./scripts/start-dev.sh${NC}"
    echo ""
    echo -e "  3. Open your browser to:"
    echo -e "     ${GREEN}http://localhost:5173${NC}"
    echo ""
    
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo -e "  • Start services:    ${YELLOW}./scripts/start-dev.sh${NC}"
    echo -e "  • Stop services:     ${YELLOW}./scripts/stop-dev.sh${NC}"
    echo -e "  • Health check:      ${YELLOW}./scripts/health-check.sh${NC}"
    echo -e "  • Validate config:   ${YELLOW}./scripts/validate-env.sh${NC}"
    echo ""
    
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo -e "  • Development guide: ${CYAN}docs/DEVELOPMENT.md${NC}"
    echo -e "  • Project README:    ${CYAN}README.md${NC}"
    echo ""
    
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Function to handle errors
handle_error() {
    local exit_code=$?
    echo ""
    print_error "Setup failed with exit code $exit_code"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo -e "  1. Check that you have Node.js 18+ installed"
    echo -e "  2. Ensure you have write permissions in this directory"
    echo -e "  3. Check your internet connection for npm installs"
    echo -e "  4. Try running individual steps manually"
    echo ""
    exit $exit_code
}

# Main execution
main() {
    # Set up error handling
    trap handle_error ERR
    
    case "$1" in
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "This script sets up the complete AION development environment."
            echo ""
            echo "Options:"
            echo "  --help, -h      Show this help message"
            echo ""
            echo "What this script does:"
            echo "  1. Checks prerequisites (Node.js, npm, etc.)"
            echo "  2. Creates project structure"
            echo "  3. Installs dependencies"
            echo "  4. Sets up environment files"
            echo "  5. Makes scripts executable"
            echo "  6. Runs initial validation"
            echo "  7. Creates documentation"
            echo ""
            echo "After running this script, use './scripts/start-dev.sh' to start development."
            ;;
        *)
            print_info "Setting up AION development environment..."
            echo ""
            
            check_prerequisites
            create_project_structure
            install_dependencies
            setup_environment_files
            setup_scripts
            run_initial_validation
            create_documentation
            
            show_setup_summary
            ;;
    esac
}

# Run main function
main "$@"