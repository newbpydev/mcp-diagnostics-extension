# MCP Diagnostics Extension

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/newbpydev.mcp-diagnostics-extension.svg)](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/newbpydev.mcp-diagnostics-extension.svg)](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/newbpydev.mcp-diagnostics-extension.svg)](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Visual Studio Code extension that exposes diagnostic problems (errors, warnings, etc.) via the Model Context Protocol (MCP) for consumption by AI agents and other MCP-enabled tools.

## ✨ Features

- **🔍 Real-time Diagnostics Monitoring**: Automatically captures all diagnostic problems from VS Code's Problems panel
- **🤖 MCP Server Integration**: Exposes diagnostics through standardized MCP tools and resources
- **⚡ Performance Optimized**: Debounced event handling for large workspaces (300ms default)
- **🏢 Multi-workspace Support**: Handles complex project structures with multiple workspace folders
- **📡 Real-time Notifications**: Pushes diagnostic changes to connected MCP clients
- **📊 Status Bar Integration**: Shows live error/warning counts with quick access to server status
- **🎛️ Command Palette**: Restart server and view detailed status via Command Palette
- **🔧 Configurable**: Customizable port, debounce timing, and logging options

## 📦 Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "MCP Diagnostics Server"
4. Click **Install**

### From VSIX File

1. Download the latest `.vsix` file from [Releases](https://github.com/newbpydev/mcp-diagnostics-extension/releases)
2. Open VS Code
3. Run command: `Extensions: Install from VSIX...`
4. Select the downloaded file

### From Source

```bash
git clone https://github.com/newbpydev/mcp-diagnostics-extension.git
cd mcp-diagnostics-extension
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

## 🚀 Usage

### Basic Setup

The extension activates automatically when VS Code starts. No additional configuration is required for basic usage.

**Status Bar**: Look for the status bar item showing `$(bug) MCP: XE YW` (X errors, Y warnings)

### MCP Client Connection

Connect your MCP client to the server using stdio transport:

```json
{
  "mcpServers": {
    "vscode-diagnostics": {
      "command": "node",
      "args": ["/path/to/mcp-diagnostics-extension/out/mcp-server.js"]
    }
  }
}
```

### Available Commands

Access these commands via Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

- **`MCP Diagnostics: Restart Server`** - Restart the MCP server
- **`MCP Diagnostics: Show Status`** - Display detailed server status and statistics

### Available MCP Tools

#### `getProblems`
Get all diagnostic problems with optional filtering:

```json
{
  "name": "getProblems",
  "arguments": {
    "filePath": "/path/to/file.ts",     // Optional: filter by file
    "severity": "Error",               // Optional: Error, Warning, Information, Hint
    "workspaceFolder": "my-project",   // Optional: filter by workspace
    "limit": 100,                      // Optional: limit results (default: 1000)
    "offset": 0                        // Optional: pagination offset
  }
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"filePath\":\"/workspace/src/app.ts\",\"severity\":\"Error\",\"message\":\"Cannot find name 'foo'\",\"range\":{\"start\":{\"line\":10,\"character\":5},\"end\":{\"line\":10,\"character\":8}},\"source\":\"typescript\",\"workspaceFolder\":\"/workspace\"}]"
    }
  ]
}
```

#### `getProblemsForFile`
Get problems for a specific file:

```json
{
  "name": "getProblemsForFile",
  "arguments": {
    "filePath": "/path/to/file.ts"
  }
}
```

#### `getWorkspaceSummary`
Get summary statistics of problems across workspace:

```json
{
  "name": "getWorkspaceSummary",
  "arguments": {
    "groupBy": "severity"  // Optional: severity, source, workspaceFolder
  }
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"totalProblems\":15,\"byFile\":{\"app.ts\":3,\"utils.ts\":2},\"bySeverity\":{\"Error\":5,\"Warning\":10},\"byWorkspace\":{\"main\":15}}"
    }
  ]
}
```

### Available MCP Resources

- **`diagnostics://summary`** - Overall problems summary with statistics
- **`diagnostics://file/{encodedFilePath}`** - Problems for specific file
- **`diagnostics://workspace/{encodedWorkspaceName}`** - Problems for specific workspace

### Real-time Notifications

The server sends `problemsChanged` notifications when diagnostics change:

```json
{
  "method": "notifications/message",
  "params": {
    "level": "info",
    "data": {
      "type": "problemsChanged",
      "uri": "/path/to/file.ts",
      "problemCount": 3,
      "problems": [...],
      "timestamp": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

## 🧪 Testing & Development

### Real vs Mock Server

This extension provides **two different ways** to access diagnostic data:

1. **🔴 Real VS Code Extension** (Recommended)
   - Gets actual diagnostics from VS Code's Problems panel
   - Automatically activated when extension is installed
   - Provides real-time diagnostic data from your workspace

2. **🧪 Mock Standalone Server** (Testing Only)
   - Provides simulated diagnostic data for testing MCP integration
   - Located in `scripts/standalone-mcp-server.js`
   - Used by `cursor-mcp-config.json` for testing purposes

### Test Workspace

The extension includes a `test-workspace/` directory with intentional errors for testing:

- **`example.ts`**: TypeScript errors (type mismatches, undefined variables)
- **`utils.js`**: ESLint warnings (unused variables, style issues)

To test the extension:

1. **Open VS Code Extension Development Host** (Press F5)
2. **Open the test workspace** or any workspace with diagnostic issues
3. **View Problems panel** (Ctrl+Shift+M) to see real diagnostics
4. **Use MCP tools** to query the diagnostic data

### Configuration Files

- **`cursor-mcp-config.json`**: Uses mock server for testing
- **`mcp-server-config.json`**: Uses real extension (requires VS Code)

For real diagnostic data, always use the VS Code extension, not the standalone mock server.

## ⚙️ Configuration

Configure the extension through VS Code settings (`Ctrl+,` / `Cmd+,`):

```json
{
  "mcpDiagnostics.server.port": 6070,
  "mcpDiagnostics.debounceMs": 300,
  "mcpDiagnostics.enablePerformanceLogging": false,
  "mcpDiagnostics.enableDebugLogging": false,
  "mcpDiagnostics.maxProblemsPerFile": 1000
}
```

### Settings Reference

| Setting | Default | Description |
|---------|---------|-------------|
| `server.port` | `6070` | Port for the MCP server |
| `debounceMs` | `300` | Debounce interval in milliseconds for diagnostic events |
| `enablePerformanceLogging` | `false` | Enable performance logging for debugging |
| `enableDebugLogging` | `false` | Enable detailed debug logging |
| `maxProblemsPerFile` | `1000` | Maximum number of problems to track per file |

## 🔧 Troubleshooting

### Server Not Starting

1. **Check VS Code Output panel** for error messages:
   - View → Output → Select "MCP Diagnostics" from dropdown
2. **Verify port availability**: Ensure port 6070 is not in use by another application
3. **Try restarting VS Code** completely
4. **Use the restart command**: `MCP Diagnostics: Restart Server` from Command Palette

### No Diagnostics Appearing

1. **Ensure you have actual problems**:
   - Open a file with syntax errors or linting issues
   - Check that the Problems panel (View → Problems) shows diagnostics
2. **Verify language servers are running**:
   - TypeScript: Check that `.ts` files show IntelliSense
   - ESLint: Ensure ESLint extension is installed and configured
3. **Enable debug logging**:
   ```json
   {
     "mcpDiagnostics.enableDebugLogging": true
   }
   ```
4. **Check the status**: Use `MCP Diagnostics: Show Status` command

### Performance Issues

1. **Increase debounce interval** for large workspaces:
   ```json
   {
     "mcpDiagnostics.debounceMs": 500
   }
   ```
2. **Reduce max problems per file** if needed:
   ```json
   {
     "mcpDiagnostics.maxProblemsPerFile": 500
   }
   ```
3. **Enable performance logging** to identify bottlenecks:
   ```json
   {
     "mcpDiagnostics.enablePerformanceLogging": true
   }
   ```

### MCP Client Connection Issues

1. **Verify server is running**: Check status bar shows `MCP: Running`
2. **Check port configuration**: Ensure client connects to correct port (default: 6070)
3. **Review client logs**: Check your MCP client's connection logs
4. **Test with simple client**: Use a basic MCP client to verify server functionality

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

#### ExtensionCommands
- Status bar integration with live problem counts
- Command Palette commands for server management
- Webview for detailed status and statistics

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

## 🛠️ Development

### Prerequisites

- VS Code 1.85.0 or higher
- Node.js 18.0 or higher
- npm 8.0 or higher

### Project Structure

```
src/
├── extension.ts              # Main activation/deactivation logic
├── commands/                 # VS Code commands and UI integration
│   └── ExtensionCommands.ts  # Status bar and command implementations
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
npm run package        # Create VSIX package
npm run publish        # Publish to marketplace
```

### Development Workflow

1. **Test-Driven Development**: Write tests first, then implementation
2. **Clean Architecture**: Keep core logic independent of frameworks
3. **Type Safety**: Use strict TypeScript with runtime validation
4. **Performance**: Monitor with debouncing and efficient caching

### Testing

The project uses Jest with comprehensive VS Code API mocking:

```bash
# Run all tests (300+ tests)
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
- Support: 10,000+ file workspaces

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
- **Testing**: Write tests for all new functionality (TDD approach)
- **Documentation**: Update README and inline documentation
- **Performance**: Consider impact on large workspaces

### Pull Request Process

1. Ensure all tests pass (`npm test`)
2. Update documentation as needed
3. Follow conventional commit messages
4. Request review from maintainers
5. Address feedback promptly

## 📊 Test Coverage

Current test coverage: **300+ tests** with comprehensive coverage across:

- **Unit Tests**: 90%+ coverage of core components
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Critical user workflow validation
- **VS Code API Mocking**: Complete mock framework

### Test Categories

- DiagnosticsWatcher: Event handling, debouncing, conversion logic
- MCP Server: Tools, resources, notifications, error handling
- ExtensionCommands: Status bar, commands, webview integration
- Performance: Memory usage, response times, large workspace handling

## 🚀 Project Status

**PRODUCTION READY - Marketplace Publication Approved**

This project has undergone a comprehensive audit and **fully meets all requirements** of the original vision. Key achievements:
- ✅ **322 passing tests** with 96%+ coverage
- ✅ **All performance benchmarks met** (activation <2s, processing <500ms, MCP <100ms)
- ✅ **Clean Architecture** with proper separation of concerns
- ✅ **Complete CI/CD pipeline** with multi-platform support
- ✅ **Professional documentation** and marketplace assets

📋 **[View Comprehensive Project Audit Report](internal-docs/COMPREHENSIVE-PROJECT-AUDIT-REPORT.md)**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

## 🙏 Acknowledgments

- [VS Code Extension API](https://code.visualstudio.com/api) for the comprehensive extension framework
- [Model Context Protocol](https://modelcontextprotocol.io/) for the standardized AI agent communication
- [TypeScript](https://www.typescriptlang.org/) for type safety and developer experience
- [Jest](https://jestjs.io/) for the testing framework

## 📞 Support

- 📖 [Documentation](https://github.com/newbpydev/mcp-diagnostics-extension/wiki)
- 🐛 [Issue Tracker](https://github.com/newbpydev/mcp-diagnostics-extension/issues)
- 💬 [Discussions](https://github.com/newbpydev/mcp-diagnostics-extension/discussions)
- 📧 [Email Support](mailto:support@newbpydev.com)

## 🌟 Show Your Support

If this extension helps you, please:
- ⭐ Star the repository
- 📝 Leave a review on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)
- 🐛 Report issues or suggest features
- 🤝 Contribute to the project

---

**Built with ❤️ for the VS Code and AI agent community**
