# MCP Diagnostics Extension

<!-- Marketplace & Distribution Badges -->
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/newbpydev.mcp-diagnostics-extension.svg?style=flat-square&logo=visual-studio-code&color=007ACC)](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/newbpydev.mcp-diagnostics-extension.svg?style=flat-square&color=brightgreen)](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/newbpydev.mcp-diagnostics-extension.svg?style=flat-square&color=yellow)](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/newbpydev.mcp-diagnostics-extension.svg?style=flat-square&color=blue)](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)

<!-- Build & Quality Badges -->
[![CI/CD Pipeline](https://img.shields.io/github/actions/workflow/status/newbpydev/mcp-diagnostics-extension/ci-cd.yml?style=flat-square&logo=github&label=CI%2FCD)](https://github.com/newbpydev/mcp-diagnostics-extension/actions/workflows/ci-cd.yml)
[![Release Pipeline](https://img.shields.io/github/actions/workflow/status/newbpydev/mcp-diagnostics-extension/release.yml?style=flat-square&logo=github&label=Release)](https://github.com/newbpydev/mcp-diagnostics-extension/actions/workflows/release.yml)
[![Tests](https://img.shields.io/badge/tests-322%20passing-brightgreen?style=flat-square&logo=jest)](https://github.com/newbpydev/mcp-diagnostics-extension/actions)
[![Test Coverage](https://img.shields.io/badge/coverage-75.74%25-orange?style=flat-square&logo=jest)](https://github.com/newbpydev/mcp-diagnostics-extension/actions)

<!-- Technology & Standards Badges -->
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![VS Code Engine](https://img.shields.io/badge/VS%20Code-1.96.0+-007ACC?style=flat-square&logo=visual-studio-code)](https://code.visualstudio.com/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.12.1-purple?style=flat-square)](https://github.com/modelcontextprotocol/typescript-sdk)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green?style=flat-square&logo=node.js)](https://nodejs.org/)

<!-- License & Security Badges -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Security Policy](https://img.shields.io/badge/Security-Policy-red?style=flat-square&logo=shield)](https://github.com/newbpydev/mcp-diagnostics-extension/security/policy)
[![Dependabot](https://img.shields.io/badge/Dependabot-enabled-brightgreen?style=flat-square&logo=dependabot)](https://github.com/newbpydev/mcp-diagnostics-extension/network/dependencies)

<!-- Project Status & Community Badges -->
[![GitHub Release](https://img.shields.io/github/v/release/newbpydev/mcp-diagnostics-extension?style=flat-square&logo=github)](https://github.com/newbpydev/mcp-diagnostics-extension/releases)
[![GitHub Issues](https://img.shields.io/github/issues/newbpydev/mcp-diagnostics-extension?style=flat-square&logo=github)](https://github.com/newbpydev/mcp-diagnostics-extension/issues)
[![GitHub Stars](https://img.shields.io/github/stars/newbpydev/mcp-diagnostics-extension?style=flat-square&logo=github)](https://github.com/newbpydev/mcp-diagnostics-extension/stargazers)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org/)

---

**A VS Code extension that exposes diagnostic problems (errors, warnings, etc.) in real-time via the Model Context Protocol (MCP) for seamless consumption by AI agents and MCP-enabled tools.**

## 🚀 What is this?

The MCP Diagnostics Extension bridges VS Code's powerful diagnostic system with the Model Context Protocol, enabling AI agents to access your code problems in real-time. Whether you're debugging TypeScript errors, ESLint warnings, or custom linter issues, this extension makes all diagnostic information instantly available to your AI tools.

### Why was this built?

- **🤖 AI-First Development**: Modern development increasingly relies on AI assistance. This extension ensures your AI tools have complete visibility into your codebase health.
- **⚡ Real-time Integration**: No more manually copying error messages or explaining problems to AI tools - they see everything instantly.
- **🔧 Universal Diagnostics**: Works with any VS Code diagnostic provider (TypeScript, ESLint, custom linters, etc.)
- **📊 Enhanced Productivity**: AI agents can provide more contextual help when they understand your current problems.

### What problem does it solve?

Before this extension, AI agents couldn't see your VS Code problems panel, making it difficult for them to:
- Understand compilation errors when suggesting fixes
- Provide relevant solutions for linting issues
- Help with project-wide diagnostic patterns
- Assist with debugging based on current error state

### Key Features Learned & Implemented

- **🔍 Real-time Diagnostics Monitoring**: Automatically captures all diagnostic problems from VS Code's Problems panel using advanced event debouncing (300ms configurable)
- **🤖 MCP Server Integration**: Exposes diagnostics through standardized MCP tools and resources with comprehensive filtering capabilities
- **⚡ Performance Optimized**: Handles large workspaces efficiently with smart caching and memory management
- **🏢 Multi-workspace Support**: Seamlessly works with complex project structures and multiple workspace folders
- **📡 Real-time Notifications**: Pushes diagnostic changes instantly to connected MCP clients with structured payloads
- **📊 Status Bar Integration**: Live error/warning counts with quick access to detailed server status
- **🎛️ Command Palette**: Full integration with VS Code commands for server management and status viewing
- **🔧 Highly Configurable**: Customizable port, debounce timing, logging options, and performance settings
- **🚀 Automatic Registration**: One-click setup with intelligent MCP server registration across different environments
- **🧪 Test Workspace**: Comprehensive testing environment with intentional errors for validation
- **🛡️ Robust Error Handling**: Graceful degradation and comprehensive error recovery mechanisms

## 📦 Installation

### From VS Code Marketplace (Recommended)

1. **Open VS Code**
2. **Go to Extensions** (Ctrl+Shift+X / Cmd+Shift+X)
3. **Search for** "MCP Diagnostics Extension"
4. **Click Install**
5. **Reload VS Code** if prompted

The extension will automatically activate and register itself as an MCP server.

### From VSIX File

1. Download the latest `.vsix` file from [GitHub Releases](https://github.com/newbpydev/mcp-diagnostics-extension/releases)
2. Open VS Code
3. Run command: `Extensions: Install from VSIX...`
4. Select the downloaded file

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/newbpydev/mcp-diagnostics-extension.git
cd mcp-diagnostics-extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Launch Extension Development Host
# Press F5 in VS Code or run:
code --extensionDevelopmentPath=.
```

## 🚀 Quick Start

### 1. **Installation & Activation**
After installing from the marketplace, the extension automatically:
- ✅ Activates when VS Code starts
- ✅ Registers as an MCP server
- ✅ Starts monitoring diagnostics
- ✅ Shows status in the status bar

### 2. **Verify It's Working**
Look for the status bar item: `$(bug) MCP: XE YW` (X errors, Y warnings)

### 3. **Connect Your MCP Client**
Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "vscode-diagnostics": {
      "command": "node",
      "args": ["/path/to/extension/out/mcp-server.js"]
    }
  }
}
```

### 4. **Start Using MCP Tools**
Your AI agent can now access three powerful tools:
- `getProblems` - Get all diagnostics with filtering
- `getProblemsForFile` - Get problems for specific files
- `getWorkspaceSummary` - Get workspace-wide statistics

## 🛠️ Usage Guide

### Available Commands

Access via Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

- **`MCP Diagnostics: Show Status`** - Opens detailed status webview with:
  - Server connection status
  - Problem statistics by severity and source
  - File-by-file breakdown
  - Workspace folder information
  - Performance metrics

- **`MCP Diagnostics: Restart Server`** - Restarts the MCP server with progress indication

### MCP Tools Reference

#### 🔍 `getProblems` - Universal Problem Query
Get all diagnostic problems with powerful filtering options:

```json
{
  "name": "getProblems",
  "arguments": {
    "filePath": "/path/to/file.ts",        // Optional: filter by specific file
    "severity": "Error",                   // Optional: Error, Warning, Information, Hint
    "workspaceFolder": "my-project",       // Optional: filter by workspace
    "source": "typescript",               // Optional: filter by diagnostic source
    "limit": 100,                         // Optional: limit results (default: 1000)
    "offset": 0                           // Optional: pagination offset
  }
}
```

**Example Response:**
```json
{
  "content": [{
    "type": "text",
    "text": "[{\"filePath\":\"/workspace/src/app.ts\",\"severity\":\"Error\",\"message\":\"Cannot find name 'foo'\",\"range\":{\"start\":{\"line\":10,\"character\":5},\"end\":{\"line\":10,\"character\":8}},\"source\":\"typescript\",\"workspaceFolder\":\"/workspace\",\"code\":\"2304\"}]"
  }]
}
```

#### 📄 `getProblemsForFile` - File-Specific Diagnostics
Get all problems for a specific file:

```json
{
  "name": "getProblemsForFile",
  "arguments": {
    "filePath": "/absolute/path/to/file.ts"
  }
}
```

#### 📊 `getWorkspaceSummary` - Workspace Statistics
Get comprehensive workspace diagnostic statistics:

```json
{
  "name": "getWorkspaceSummary",
  "arguments": {
    "groupBy": "severity"  // Optional: severity, source, workspaceFolder
  }
}
```

**Example Response:**
```json
{
  "content": [{
    "type": "text",
    "text": "{\"totalProblems\":15,\"byFile\":{\"app.ts\":3,\"utils.ts\":2},\"bySeverity\":{\"Error\":5,\"Warning\":10},\"bySource\":{\"typescript\":8,\"eslint\":7},\"byWorkspace\":{\"main\":15},\"timestamp\":\"2024-01-15T10:30:00.000Z\"}"
  }]
}
```

### MCP Resources

Dynamic resources providing structured access to diagnostic data:

- **`diagnostics://summary`** - Overall workspace problems summary
- **`diagnostics://file/{encodedFilePath}`** - Problems for specific file
- **`diagnostics://workspace/{encodedWorkspaceName}`** - Problems for specific workspace

### Real-time Notifications

The server automatically sends `problemsChanged` notifications when diagnostics change:

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
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## ⚙️ Configuration

Customize the extension via VS Code settings (`Ctrl+,` / `Cmd+,`):

```json
{
  "mcpDiagnostics.server.port": 6070,
  "mcpDiagnostics.debounceMs": 300,
  "mcpDiagnostics.enableDebugLogging": false,
  "mcpDiagnostics.enablePerformanceLogging": false,
  "mcpDiagnostics.maxProblemsPerFile": 1000,
  "mcpDiagnostics.debug.logLevel": "info",
  "mcpDiagnostics.showAutoRegistrationNotification": true
}
```

### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `server.port` | number | 6070 | MCP server port (1024-65535) |
| `debounceMs` | number | 300 | Debounce interval for diagnostic events (50-5000ms) |
| `enableDebugLogging` | boolean | false | Enable detailed debug logging |
| `enablePerformanceLogging` | boolean | false | Enable performance metrics logging |
| `maxProblemsPerFile` | number | 1000 | Maximum problems to track per file (1-10000) |
| `debug.logLevel` | string | "info" | Logging level (error, warn, info, debug) |
| `showAutoRegistrationNotification` | boolean | true | Show MCP server registration notifications |

## 🧪 Testing & Development

### Real vs Mock Server

The extension provides **two operational modes**:

#### 🔴 **Real VS Code Extension** (Production Mode)
- **Purpose**: Production use with actual VS Code diagnostics
- **Data Source**: Live VS Code Problems panel
- **Activation**: Automatic when extension is installed
- **Use Case**: Real development workflows with AI agents

#### 🧪 **Mock Standalone Server** (Testing Mode)
- **Purpose**: Testing MCP integration without VS Code
- **Data Source**: Simulated diagnostic data
- **Location**: `scripts/standalone-mcp-server.js`
- **Configuration**: `cursor-mcp-config.json`
- **Use Case**: Testing, development, and CI/CD environments

### Test Workspace

The extension includes `test-workspace/` with intentional errors:

- **`example.ts`**: TypeScript errors (type mismatches, undefined variables, invalid assignments)
- **`utils.js`**: ESLint warnings (unused variables, style issues, best practice violations)

**To test the extension:**

1. **Launch Extension Development Host** (Press F5 in VS Code)
2. **Open test workspace** or any workspace with diagnostic issues
3. **View Problems panel** (Ctrl+Shift+M) to see real diagnostics
4. **Use MCP tools** to query the diagnostic data
5. **Check status bar** for live error/warning counts

### Development Setup

```bash
# Install dependencies
npm install

# Run tests (322 tests)
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Compile TypeScript
npm run compile

# Package extension
npm run package

# Run CI checks
npm run ci:check
```

### MCP Client Configuration Examples

#### Cursor IDE
```json
// cursor-mcp-config.json
{
  "mcpServers": {
    "vscode-diagnostics-mock": {
      "command": "node",
      "args": ["./scripts/standalone-mcp-server.js"]
    }
  }
}
```

#### Claude Desktop
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "vscode-diagnostics": {
      "command": "node",
      "args": ["/path/to/extension/out/mcp-server.js"]
    }
  }
}
```

#### Custom MCP Client
```typescript
import { Client } from '@modelcontextprotocol/client';

const client = new Client({
  name: "my-client",
  version: "1.0.0"
});

// Connect to extension
await client.connect({
  command: "node",
  args: ["/path/to/extension/out/mcp-server.js"]
});

// Use tools
const problems = await client.callTool({
  name: "getProblems",
  arguments: { severity: "Error" }
});
```

## 📚 Documentation

### Additional Resources

- **[MCP Server Guide](./MCP_SERVER_GUIDE.md)** - Comprehensive setup and configuration guide
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[Contributing Guide](./CONTRIBUTING.md)** - Development and contribution guidelines
- **[Changelog](./CHANGELOG.md)** - Version history and release notes
- **[Security Policy](./SECURITY.md)** - Security reporting and policies

### API Documentation

Comprehensive TypeScript documentation is available for all public APIs:

- **[DiagnosticsWatcher API](./src/core/diagnostics/)** - Core diagnostic monitoring
- **[MCP Tools API](./src/infrastructure/mcp/)** - MCP server implementation
- **[Extension Commands API](./src/commands/)** - VS Code command integration

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** following our coding standards
4. **Run tests**: `npm test` (all 322 tests must pass)
5. **Lint code**: `npm run lint`
6. **Commit changes**: `npm run commit` (uses conventional commits)
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Requirements

- Node.js 22.x or higher
- VS Code 1.96.0 or higher
- TypeScript 5.8.3 or higher

## 🐛 Troubleshooting

### Common Issues

#### Extension Not Activating
1. Check VS Code version compatibility (requires 1.96.0+)
2. Look for activation errors in Developer Tools Console
3. Try reloading VS Code window (Ctrl+Shift+P → "Reload Window")

#### MCP Connection Issues
1. Verify MCP client configuration paths
2. Check that the extension is active (status bar shows MCP status)
3. Restart the MCP server: Command Palette → "MCP Diagnostics: Restart Server"

#### No Diagnostics Showing
1. Ensure you have files with actual errors/warnings open
2. Check VS Code Problems panel (Ctrl+Shift+M) - MCP data comes from here
3. Verify diagnostic providers (TypeScript, ESLint) are working

For more detailed troubleshooting, see our [Troubleshooting Guide](./TROUBLESHOOTING.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **VS Code Team** - For the excellent Extension API and diagnostic system
- **Model Context Protocol Team** - For creating the MCP standard enabling AI tool integration
- **TypeScript Team** - For the robust type system making this extension reliable
- **Community Contributors** - For testing, feedback, and contributions

## 📞 Support & Community

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/newbpydev/mcp-diagnostics-extension/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/newbpydev/mcp-diagnostics-extension/discussions)
- **📧 Email**: [newbpydev@gmail.com](mailto:newbpydev@gmail.com)
- **🔗 GitHub**: [@newbpydev](https://github.com/newbpydev)

---

**Made with ❤️ for the VS Code and AI development community**

*If you find this extension helpful, please consider giving it a ⭐ on GitHub and leaving a review on the VS Code Marketplace!*
