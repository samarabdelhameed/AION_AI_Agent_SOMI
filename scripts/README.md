# AION Development Scripts

This directory contains all the development scripts for the AION project. These scripts automate the setup, management, and monitoring of the development environment.

## 📋 Available Scripts

### 🛠️ Setup Scripts

#### `setup-dev.sh`
**Complete development environment setup from scratch**

```bash
./scripts/setup-dev.sh
```

**What it does:**
- Checks prerequisites (Node.js, npm, curl)
- Creates project structure and directories
- Installs all dependencies (MCP Agent + Frontend)
- Sets up environment files with defaults
- Makes all scripts executable
- Runs initial validation
- Creates development documentation

**When to use:** First time setup or after cloning the repository

---

### 🚀 Service Management Scripts

#### `start-dev.sh`
**Start all development services**

```bash
./scripts/start-dev.sh
```

**What it does:**
- Validates environment and dependencies
- Creates missing .env files if needed
- Starts MCP Agent backend on port 3003
- Starts Frontend development server on port 5173
- Monitors services and provides status updates
- Keeps running until Ctrl+C

**Services started:**
- MCP Agent Backend: http://localhost:3003
- Frontend App: http://localhost:5173

#### `stop-dev.sh`
**Stop all development services**

```bash
./scripts/stop-dev.sh                # Stop services only
./scripts/stop-dev.sh --clean-logs   # Stop services and clean logs
```

**What it does:**
- Gracefully stops all running services
- Kills processes by PID and port
- Cleans up development files
- Optionally removes log files

---

### 🏥 Monitoring Scripts

#### `health-check.sh`
**Comprehensive health check for all services**

```bash
./scripts/health-check.sh           # Full health check
./scripts/health-check.sh --quick   # Quick service status only
```

**What it checks:**
- Service status (running/stopped)
- HTTP endpoint accessibility
- API health endpoints
- Environment configuration
- System dependencies
- Network connectivity
- System resources

**Health Score:**
- 0 issues: Perfect ✅
- 1-2 issues: Minor warnings ⚠️
- 3+ issues: Critical problems 🚨

#### `validate-env.sh`
**Environment configuration validation**

```bash
./scripts/validate-env.sh                  # Validate existing config
./scripts/validate-env.sh --create-missing # Create missing .env files
```

**What it validates:**
- Required environment variables
- Configuration consistency between services
- Contract address formats
- Network connectivity (RPC endpoints)
- Port configuration matching

---

## 🔄 Typical Development Workflow

### Initial Setup (One Time)
```bash
# 1. Clone repository and navigate to project
git clone <repository-url>
cd aion-project

# 2. Run complete setup
./scripts/setup-dev.sh

# 3. Review and update environment files
nano mcp_agent/.env
nano frontend/.env
```

### Daily Development
```bash
# Start development environment
./scripts/start-dev.sh

# In another terminal, check health
./scripts/health-check.sh

# When done, stop services
./scripts/stop-dev.sh
```

### Troubleshooting
```bash
# Check what's wrong
./scripts/health-check.sh

# Validate configuration
./scripts/validate-env.sh

# View logs
tail -f logs/mcp_agent.log
tail -f logs/frontend.log

# Restart services
./scripts/stop-dev.sh
./scripts/start-dev.sh
```

---

## 📁 File Structure

```
scripts/
├── README.md           # This file
├── setup-dev.sh        # Complete environment setup
├── start-dev.sh        # Start all services
├── stop-dev.sh         # Stop all services
├── health-check.sh     # Health monitoring
└── validate-env.sh     # Environment validation

logs/                   # Service logs (created automatically)
├── mcp_agent.log      # Backend logs
└── frontend.log       # Frontend logs

.dev_pids/             # Process IDs (created automatically)
├── mcp_agent.pid      # Backend PID
└── frontend.pid       # Frontend PID
```

---

## 🔧 Configuration Files

### MCP Agent Environment (`mcp_agent/.env`)
```bash
NODE_ENV=development
PORT=3003
LOG_LEVEL=debug
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
CORS_ORIGIN=http://localhost:5173
```

### Frontend Environment (`frontend/.env`)
```bash
VITE_APP_NAME=AION DeFi Platform
VITE_MCP_URL=http://localhost:3003
VITE_BSC_RPC_URL=https://bsc-dataseed.binance.org/
VITE_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
VITE_DEBUG_MODE=true
```

---

## 🚨 Troubleshooting Guide

### Common Issues

#### "Port already in use"
```bash
# Check what's using the port
lsof -i :3003
lsof -i :5173

# Kill processes on ports
./scripts/stop-dev.sh

# Or manually kill
kill -9 $(lsof -ti:3003)
kill -9 $(lsof -ti:5173)
```

#### "Cannot connect to backend"
```bash
# Check if MCP Agent is running
./scripts/health-check.sh --quick

# Check MCP Agent logs
tail -f logs/mcp_agent.log

# Verify environment configuration
./scripts/validate-env.sh
```

#### "Dependencies not installed"
```bash
# Reinstall dependencies
cd mcp_agent && npm install
cd ../frontend && npm install

# Or run full setup again
./scripts/setup-dev.sh
```

#### "Environment variables missing"
```bash
# Create missing .env files
./scripts/validate-env.sh --create-missing

# Or run setup again
./scripts/setup-dev.sh
```

### Service URLs

- **Frontend Application**: http://localhost:5173
- **MCP Agent API**: http://localhost:3003
- **Health Check**: http://localhost:3003/health
- **API Documentation**: http://localhost:3003/docs (if available)

### Log Files

- **MCP Agent**: `tail -f logs/mcp_agent.log`
- **Frontend**: `tail -f logs/frontend.log`
- **All logs**: `tail -f logs/*.log`

---

## 🎯 Script Features

### Robust Error Handling
- Graceful failure handling
- Detailed error messages
- Recovery suggestions
- Exit codes for automation

### Health Monitoring
- Service status tracking
- Endpoint accessibility checks
- Resource usage monitoring
- Configuration validation

### Development Friendly
- Colored output for readability
- Progress indicators
- Detailed logging
- Interactive feedback

### Production Ready
- Environment separation
- Security considerations
- Performance monitoring
- Deployment preparation

---

## 🔄 Updates and Maintenance

### Updating Scripts
When updating scripts, ensure they remain executable:
```bash
chmod +x scripts/*.sh
```

### Adding New Scripts
1. Create script in `scripts/` directory
2. Make it executable: `chmod +x scripts/new-script.sh`
3. Add documentation to this README
4. Test thoroughly in development

### Script Dependencies
All scripts are designed to work independently but may call each other:
- `setup-dev.sh` → calls `validate-env.sh`
- `start-dev.sh` → calls `health-check.sh`
- `validate-env.sh` → creates environment files

---

## 📞 Support

If you encounter issues with these scripts:

1. **Check the logs**: `tail -f logs/*.log`
2. **Run health check**: `./scripts/health-check.sh`
3. **Validate environment**: `./scripts/validate-env.sh`
4. **Try full reset**: `./scripts/stop-dev.sh && ./scripts/setup-dev.sh`

For additional help, refer to the main project documentation or create an issue in the repository.

---

**Happy Development! 🚀**