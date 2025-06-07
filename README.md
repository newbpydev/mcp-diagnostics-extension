# VS Code MCP Diagnostics Extension

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.74+-green.svg)](https://code.visualstudio.com/)
[![Jest](https://img.shields.io/badge/Jest-29+-red.svg)](https://jestjs.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A VS Code extension that monitors the Problems panel in real-time and exposes diagnostics via a Model Context Protocol (MCP) server for AI agent consumption.

## 🎯 Overview

This extension bridges VS Code's diagnostic system with AI agents by:

- **Real-time monitoring** of the Problems panel for errors, warnings, and hints
- **MCP server** that exposes diagnostics through standardized tools and resources
- **Event-driven architecture** with debounced updates for optimal performance
- **Clean separation** between core business logic and infrastructure concerns

## ✨ Features

- 🔍 **Real-time Diagnostics Monitoring**: Automatically captures all problems from VS Code's Problems panel
- 🤖 **MCP Server Integration**: Exposes diagnostics via Model Context Protocol for AI agent consumption
- ⚡ **Performance Optimized**: Debounced event handling and efficient caching
- 🏗️ **Clean Architecture**: Framework-independent core with testable business logic
- 🧪 **Comprehensive Testing**: Full test coverage with VS Code API mocking
- 📊 **TypeScript Strict Mode**: Maximum type safety with strict compiler settings

## 🚀 Quick Start

### Prerequisites

- VS Code 1.74.0 or higher
- Node.js 18.0 or higher
- npm 8.0 or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/newbpydev/mcp-diagnostics-extension.git
   cd mcp-diagnostics-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run compile
   ```

4. Launch in VS Code:
   ```bash
   code .
   # Press F5 to start Extension Development Host
   ```

## 🛠️ Development

### Project Structure

```
src/
├── extension.ts              # Main activation/deactivation logic
├── core/                     # Core business logic (framework-independent)
│   ├── models/              # Domain entities and value objects
│   └── services/            # Business logic and use cases
├── infrastructure/          # External system adapters
│   ├── mcp/                # MCP server implementation
│   └── vscode/             # VS Code API wrapper for testing
├── shared/                  # Shared types, constants, utilities
│   ├── types.ts            # Core interfaces (ProblemItem, etc.)
│   └── constants.ts        # Configuration and constants
└── test/                   # Test files
    ├── setup.ts            # VS Code API mocking
    ├── helpers/            # Test utilities
    ├── unit/               # Unit tests
    ├── integration/        # Integration tests
    └── fixtures/           # Test data
```

### Available Scripts

```bash
# Development
npm run compile          # Compile TypeScript
npm run watch           # Watch mode compilation
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint errors
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting

# Testing
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report

# VS Code Extension
npm run vscode:prepublish  # Prepare for publishing
```

### Development Workflow

1. **Test-Driven Development**: Write tests first, then implementation
2. **Clean Architecture**: Keep core logic independent of frameworks
3. **Type Safety**: Use strict TypeScript with runtime validation
4. **Performance**: Monitor with debouncing and efficient caching

### Testing

The project uses Jest with comprehensive VS Code API mocking:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

#### Test Structure

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **VS Code API Mocking**: Complete mock framework for VS Code APIs

## 🏗️ Architecture

### Clean Architecture Principles

- **Core Layer**: Framework-independent business logic
- **Infrastructure Layer**: Adapters for external systems (VS Code, MCP)
- **Shared Layer**: Common types, constants, and utilities

### Key Components

#### DiagnosticsWatcher
- Monitors VS Code's `onDidChangeDiagnostics` events
- Converts `vscode.Diagnostic` to `ProblemItem` models
- Implements debouncing for performance optimization

#### MCP Server
- Exposes diagnostics via Model Context Protocol
- Provides tools for querying problems
- Sends real-time notifications on changes

#### ProblemItem Model
```typescript
interface ProblemItem {
  readonly filePath: string;
  readonly workspaceFolder: string;
  readonly range: Range;
  readonly severity: ProblemSeverity;
  readonly message: string;
  readonly source: string;
  readonly code?: string | number;
}
```

## 🔧 Configuration

The extension supports the following configuration options:

```json
{
  "mcpDiagnostics.server.port": 6070,
  "mcpDiagnostics.debounceMs": 300,
  "mcpDiagnostics.enablePerformanceLogging": false,
  "mcpDiagnostics.maxProblemsPerFile": 1000
}
```

## 📡 MCP Integration

### Available Tools

- `getProblems`: Retrieve all current problems with optional filtering
- `getProblemsForFile`: Get problems for a specific file
- `getWorkspaceSummary`: Get summary statistics of problems

### Resources

- `diagnostics://workspace/summary`: Workspace problem overview
- `diagnostics://workspace/files`: Files with problems

### Notifications

- `problemsChanged`: Real-time updates when diagnostics change

## 🧪 Testing Strategy

### Test Coverage Goals

- **Unit Tests**: 90%+ coverage
- **Integration Tests**: Cover component interactions
- **E2E Tests**: Cover critical user workflows

### VS Code API Mocking

Complete mock framework for testing without VS Code dependency:

```typescript
import { VsCodeTestHelpers } from './test/helpers/vscode-test-helpers';

// Create mock diagnostics
const diagnostic = VsCodeTestHelpers.createMockDiagnostic('Test error', 0);

// Reset all mocks between tests
VsCodeTestHelpers.resetAllMocks();
```

## 🚀 Performance

### Optimization Strategies

- **Debouncing**: 300ms debounce on diagnostic change events
- **Caching**: Efficient in-memory caching of problem items
- **Lazy Loading**: Load diagnostics only when requested
- **Memory Management**: Proper cleanup and disposal

### Performance Thresholds

- Extension activation: < 2 seconds
- Diagnostic processing: < 500ms per change event
- MCP tool response: < 100ms
- Memory usage: < 50MB baseline, < 100MB with large workspace

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Make your changes following the coding standards
5. Run tests: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Coding Standards

- **TypeScript**: Strict mode with explicit return types
- **ESLint**: Follow configured rules with Prettier integration
- **Testing**: Write tests for all new functionality
- **Documentation**: Update README and inline documentation

### Pull Request Process

1. Ensure all tests pass
2. Update documentation as needed
3. Follow conventional commit messages
4. Request review from maintainers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [VS Code Extension API](https://code.visualstudio.com/api) for the comprehensive extension framework
- [Model Context Protocol](https://modelcontextprotocol.io/) for the standardized AI agent communication
- [TypeScript](https://www.typescriptlang.org/) for type safety and developer experience
- [Jest](https://jestjs.io/) for the testing framework

## 📞 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/newbpydev/mcp-diagnostics-extension/issues)
- 💬 [Discussions](https://github.com/newbpydev/mcp-diagnostics-extension/discussions)

---

**Built with ❤️ for the VS Code and AI agent community**
