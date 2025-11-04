# Contributing to AION AI DeFi Agent

Thank you for your interest in contributing to AION! This document provides guidelines for contributing to the project.

## 🚀 Quick Start

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/AION_AI_Agent.git`
3. Install dependencies: `npm run install:all`
4. Create a feature branch: `git checkout -b feature/your-feature-name`
5. Make your changes and test them
6. Submit a pull request

## 📋 Development Setup

### Prerequisites
- Node.js 18+
- npm 8+
- Foundry (for smart contracts)

### Installation
```bash
# Install all dependencies
npm run install:all

# Start development environment
npm run dev
```

## 🧪 Testing

Before submitting a PR, ensure all tests pass:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:mcp          # MCP Agent tests
npm run test:frontend     # Frontend tests
forge test               # Smart contract tests
```

## 📝 Code Style

- Use TypeScript for all new code
- Follow existing code formatting
- Add JSDoc comments for public functions
- Write tests for new features

## 🔄 Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure CI passes
4. Request review from maintainers
5. Address feedback promptly

## 🐛 Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)

## 💡 Feature Requests

For new features:
- Check existing issues first
- Provide clear use case
- Consider implementation complexity
- Be open to discussion

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.