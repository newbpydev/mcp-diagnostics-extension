# MCP Diagnostics Extension

<!-- Marketplace & Distribution Badges -->

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/newbpydev.mcp-diagnostics-extension.svg?style=flat-square&logo=visual-studio-code&color=007ACC)](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/newbpydev.mcp-diagnostics-extension.svg?style=flat-square&color=brightgreen)](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/newbpydev.mcp-diagnostics-extension.svg?style=flat-square&color=yellow)](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/newbpydev.mcp-diagnostics-extension.svg?style=flat-square&color=blue)](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)

<!-- Build & Quality Badges -->

[![CI/CD Pipeline](https://img.shields.io/github/actions/workflow/status/newbpydev/mcp-diagnostics-extension/ci-cd.yml?style=flat-square&logo=github&label=CI%2FCD)](https://github.com/newbpydev/mcp-diagnostics-extension/actions/workflows/ci-cd.yml)
[![Release Pipeline](https://img.shields.io/github/actions/workflow/status/newbpydev/mcp-diagnostics-extension/release.yml?style=flat-square&logo=github&label=Release)](https://github.com/newbpydev/mcp-diagnostics-extension/actions/workflows/release.yml)
[![Tests](https://img.shields.io/badge/tests-844%20passing-brightgreen?style=flat-square&logo=jest)](https://github.com/newbpydev/mcp-diagnostics-extension/actions)
[![Test Coverage](https://img.shields.io/badge/coverage-95.55%25-brightgreen?style=flat-square&logo=jest)](https://github.com/newbpydev/mcp-diagnostics-extension/actions)

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

**🏆 A production-ready VS Code extension that transforms your IDE into a comprehensive AI Context Bridge, streaming real-time development data (diagnostics, output channels, debug console, terminal, and tasks) via the Model Context Protocol (MCP) for seamless consumption by AI agents.**

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features-v150-ide-context-bridge)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Auto-Deployment & Setup](#-auto-deployment--one-click-setup)
- [Usage Guide](#️-usage-guide)
- [Configuration](#️-configuration)
- [MCP Client Configuration](#-mcp-client-configuration)
- [IDE Context Streaming](#-ide-context-streaming-features)
- [Testing & Development](#-testing--development)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

## 🚀 Overview

The MCP Diagnostics Extension bridges VS Code's powerful diagnostic system with the Model Context Protocol, enabling AI agents to access your complete development context in real-time. Whether you're debugging TypeScript errors, monitoring build outputs, or tracking task executions, this extension makes all IDE information instantly available to your AI tools.

### 🎯 What Problem Does This Solve?

Before this extension, AI agents couldn't see your VS Code environment, making it difficult for them to:

- ❌ Understand compilation errors when suggesting fixes
- ❌ Provide relevant solutions for linting issues
- ❌ Help with project-wide diagnostic patterns
- ❌ Access build logs, debug sessions, or terminal output
- ❌ Assist with debugging based on current error state

**Now your AI assistant sees everything automatically! 🤖**

### 🏆 Why Choose This Extension?

- **🤖 AI-First Development**: Modern development increasingly relies on AI assistance. This extension ensures your AI tools have complete visibility into your codebase health.
- **⚡ Real-time Integration**: No more manually copying error messages or explaining problems to AI tools - they see everything instantly.
- **🔧 Universal Compatibility**: Works with any VS Code diagnostic provider (TypeScript, ESLint, custom linters, etc.)
- **📊 Enhanced Productivity**: AI agents provide 10x more contextual help when they understand your current development state.

## 🚀 Key Features (v1.5.0 IDE Context Bridge)

### 🏆 World-Class Quality Standards

- **✅ 844 Tests Passing** - Comprehensive test coverage with 0 failures (1 skipped)
- **✅ 95.55% Statement Coverage** - Exceeding industry standards (95%+ target)
- **✅ Production-Ready Architecture** - Clean Architecture with dependency injection
- **✅ Professional CI/CD Pipeline** - Multi-platform testing and automated releases
- **✅ Zero Breaking Changes** - Seamless upgrade path from any previous version

### ⚡ Performance Excellence

- **⚡ <2s Extension Activation** - Lightning-fast startup performance
- **⚡ <500ms Diagnostic Processing** - Real-time problem monitoring
- **⚡ <100ms MCP Tool Response** - Instant AI agent integration
- **💾 <50MB Memory Baseline** - Efficient resource utilization
- **📊 10,000+ File Workspace Support** - Enterprise-scale capability

### 🔧 Advanced Technical Implementation

- **🎯 Event-Driven Architecture** - Loose coupling via EventEmitter patterns
- **🛡️ Robust Error Handling** - Comprehensive error recovery mechanisms
- **📈 Performance Monitoring** - Built-in metrics and optimization
- **🔄 Real-time Synchronization** - Live updates via MCP notifications
- **🌐 Cross-Platform Compatibility** - Windows, macOS, Linux support

### 🆕 NEW in v1.5.0: Complete IDE Context Bridge

| Data Stream | MCP Notification | Configuration | Status |
|-------------|------------------|---------------|---------|
| **Diagnostic Problems** | `problems/didChange` | Always enabled | ✅ Core Feature |
| **Output Channel Data** | `outputChannel/didChange` | `mcpDiagnostics.watchers.enableOutputChannels` | ✅ **NEW** |
| **Debug Console Output** | `debugConsole/didChange` | `mcpDiagnostics.watchers.enableDebugConsole` | ✅ **NEW** |
| **Terminal I/O** | `terminal/didWrite` | `mcpDiagnostics.watchers.enableTerminal` | ✅ **NEW** |
| **Task Execution Results** | `tasks/didEndProcess` | `mcpDiagnostics.watchers.enableTasks` | ✅ **NEW** |

Each stream provides structured JSON data so AI agents can reason over build logs, debug traces, terminal commands, and task statuses.

## 🚀 Quick Start

### 1. Install the Extension

**Via VS Code Marketplace (Recommended):**

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "MCP Diagnostics Extension"
4. Click Install
5. Reload VS Code if prompted

### 2. Auto-Configure Your MCP Client

**One-Click Setup:**

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run: `MCP Diagnostics: Configure Server`
3. Watch the magic happen! ✨

The extension automatically:
- ✅ Deploys the MCP server to your system
- ✅ Configures your MCP client (Cursor, VS Code, etc.)
- ✅ Validates the setup
- ✅ Creates backups of existing configurations

### 3. Verify It's Working

- **Status Bar**: Look for `$(bug) MCP: XE YW` (X errors, Y warnings)
- **Command Palette**: Run `MCP Diagnostics: Show Status` for detailed information
- **AI Assistant**: Your AI can now see all your development context automatically!

### 4. Start Using with AI

Your AI agent now has access to powerful tools:

```json
// Get all current problems
{
  "name": "getProblems",
  "arguments": {
    "severity": "Error",
    "limit": 50
  }
}

// Get workspace summary
{
  "name": "getWorkspaceSummary",
  "arguments": {}
}

// Get problems for specific file
{
  "name": "getProblemsForFile",
  "arguments": {
    "filePath": "/path/to/file.ts"
  }
}
```

## 📦 Installation

### Requirements

- **VS Code**: 1.96.0 or higher
- **Node.js**: 22.x or higher (for MCP server)
- **Operating System**: Windows, macOS, or Linux

### Installation Methods

#### 🏪 From VS Code Marketplace (Recommended)

1. **Open VS Code**
2. **Go to Extensions** (Ctrl+Shift+X / Cmd+Shift+X)
3. **Search for** "MCP Diagnostics Extension"
4. **Click Install**
5. **Reload VS Code** if prompted

The extension automatically activates and registers itself as an MCP server.

#### 📦 From VSIX File

1. Download the latest `.vsix` file from [GitHub Releases](https://github.com/newbpydev/mcp-diagnostics-extension/releases)
2. Open VS Code
3. Run command: `Extensions: Install from VSIX...`
4. Select the downloaded file

#### 🔧 From Source (Development)

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

## 🚀 Auto-Deployment & One-Click Setup

### ⚡ Automatic MCP Server Registration

The extension features **one-click automatic setup** that eliminates all manual configuration! This breakthrough feature automatically:

- ✅ **Deploys bundled MCP server** to user directory with proper permissions
- ✅ **Injects configuration** into Cursor IDE and other MCP clients
- ✅ **Validates deployment** with atomic operations and backup creation
- ✅ **Cross-platform support** with Windows/macOS/Linux compatibility
- ✅ **Error recovery** with graceful fallback to manual setup

### 🎛️ One-Click Setup Commands

#### `MCP Diagnostics: Configure Server` ⚡

**The magic command that does everything automatically!**

Access via Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

1. **Search**: "MCP Diagnostics: Configure Server"
2. **Click**: Command executes automatically
3. **Watch**: Progress notification shows deployment status
4. **Result**: Either success notification OR manual setup guide

**What it does:**

- ✅ Deploys server to `~/.mcp-diagnostics/mcp-server.js`
- ✅ Sets proper executable permissions (Unix/Linux)
- ✅ Creates version manifest for future upgrades
- ✅ Locates your MCP configuration file (workspace → user home)
- ✅ Preserves existing MCP servers during injection
- ✅ Validates configuration with JSON schema
- ✅ Creates backup before any changes
- ✅ Provides manual setup fallback if automatic fails

### 📊 Cross-Platform Deployment Support

| Platform    | Install Path                      | Executable      | Spawn Options            |
| ----------- | --------------------------------- | --------------- | ------------------------ |
| **Windows** | `%USERPROFILE%\.mcp-diagnostics\` | ❌ Not required | `shell: true` (required) |
| **macOS**   | `~/.mcp-diagnostics/`             | ✅ `chmod +x`   | `shell: false`           |
| **Linux**   | `~/.mcp-diagnostics/`             | ✅ `chmod +x`   | `shell: false`           |

### 🛡️ Security & Reliability Features

#### Atomic Operations
All file operations are atomic to prevent corruption:
1. Write to temporary file (.tmp)
2. Validate written content
3. Atomic rename to final location
4. Clean up temporary files

#### Backup Strategy
Automatic backup creation before any changes:
- Original config → config.backup
- Malformed config → config.malformed.backup
- Restore on validation failure

#### Version Management
Smart version detection and upgrade handling:
- Compare semantic versions (1.2.3 format)
- Skip deployment if same/older version
- Automatic upgrade for newer versions

## 🛠️ Usage Guide

### Available Commands

Access via Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

- **`MCP Diagnostics: Configure Server`** - One-click automatic MCP setup
- **`MCP Diagnostics: Show Status`** - Opens detailed status webview
- **`MCP Diagnostics: Restart Server`** - Restarts the MCP server
- **`MCP Diagnostics: Show Setup Guide`** - Manual setup instructions
- **`MCP Diagnostics: Create Watched Terminal`** - Creates terminal with MCP monitoring

### MCP Tools Reference

#### 🔍 `getProblems` - Universal Problem Query

Get all diagnostic problems with powerful filtering options:

```json
{
  "name": "getProblems",
  "arguments": {
    "filePath": "/path/to/file.ts",     // Optional: filter by file
    "severity": "Error",               // Optional: Error, Warning, Information, Hint
    "workspaceFolder": "my-project",   // Optional: filter by workspace
    "source": "typescript",           // Optional: filter by source
    "limit": 100,                     // Optional: limit results (default: 1000)
    "offset": 0                       // Optional: pagination offset
  }
}
```

#### 📄 `getProblemsForFile` - File-Specific Diagnostics

```json
{
  "name": "getProblemsForFile",
  "arguments": {
    "filePath": "/absolute/path/to/file.ts"
  }
}
```

#### 📊 `getWorkspaceSummary` - Workspace Statistics

```json
{
  "name": "getWorkspaceSummary",
  "arguments": {
    "groupBy": "severity"  // Optional: severity, source, workspaceFolder
  }
}
```

### Real-time Notifications

The server automatically sends notifications when data changes:

- `problems/didChange` - Diagnostic problems updated
- `outputChannel/didChange` - Output channel data written
- `debugConsole/didChange` - Debug console output received
- `terminal/didWrite` - Terminal data written
- `tasks/didEndProcess` - Task execution completed

## ⚙️ Configuration

Customize the extension via VS Code settings (Ctrl+, / Cmd+,):

```json
{
  "mcpDiagnostics.server.port": 6070,
  "mcpDiagnostics.debounceMs": 300,
  "mcpDiagnostics.enableDebugLogging": false,
  "mcpDiagnostics.enablePerformanceLogging": false,
  "mcpDiagnostics.maxProblemsPerFile": 1000,
  "mcpDiagnostics.debug.logLevel": "info",
  "mcpDiagnostics.showAutoRegistrationNotification": true,

  // v1.5.0 Watcher Settings
  "mcpDiagnostics.watchers.enableOutputChannels": true,
  "mcpDiagnostics.watchers.enableDebugConsole": true,
  "mcpDiagnostics.watchers.enableTerminal": true,
  "mcpDiagnostics.watchers.enableTasks": true
}
```

### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `server.port` | number | 6070 | MCP server port (1024-65535) |
| `debounceMs` | number | 300 | Debounce interval for events (50-5000ms) |
| `enableDebugLogging` | boolean | false | Enable detailed debug logging |
| `enablePerformanceLogging` | boolean | false | Enable performance metrics |
| `maxProblemsPerFile` | number | 1000 | Max problems per file (1-10000) |
| `debug.logLevel` | string | "info" | Log level (error, warn, info, debug) |
| `showAutoRegistrationNotification` | boolean | true | Show registration notifications |
| `watchers.enableOutputChannels` | boolean | true | Monitor output channels |
| `watchers.enableDebugConsole` | boolean | true | Monitor debug console |
| `watchers.enableTerminal` | boolean | true | Monitor terminal I/O |
| `watchers.enableTasks` | boolean | true | Monitor task execution |

## 🔧 MCP Client Configuration

The extension provides a **universal MCP server** that works with all major MCP-enabled environments.

### 🎯 Universal Configuration Pattern

All MCP clients use the same basic pattern:

```json
{
  "mcpServers": {
    "vscode-diagnostics": {
      "command": "node",
      "args": ["scripts/mcp-server.js"],
      "cwd": "/path/to/mcp-diagnostics-extension",
      "env": {
        "NODE_ENV": "production",
        "MCP_DEBUG": "false"
      }
    }
  }
}
```

### 📁 Configuration File Locations

| Environment | Configuration File | Format |
|-------------|-------------------|---------|
| **Cursor IDE** | `.cursor/mcp.json` | `mcpServers` |
| **VS Code** | `.vscode/mcp.json` | `servers` (with `type: "stdio"`) |
| **Windsurf** | `.windsurf/mcp.json` | `servers` |
| **Claude Desktop** | `claude_desktop_config.json` | `mcpServers` |

### Environment-Specific Examples

#### Cursor IDE
```json
// .cursor/mcp.json
{
  "mcpServers": {
    "vscode-diagnostics": {
      "command": "node",
      "args": ["scripts/mcp-server.js"],
      "cwd": "/path/to/mcp-diagnostics-extension",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### VS Code with MCP Extension
```json
// .vscode/mcp.json
{
  "servers": {
    "vscode-diagnostics": {
      "type": "stdio",
      "command": "node",
      "args": ["scripts/mcp-server.js"],
      "cwd": "/path/to/mcp-diagnostics-extension"
    }
  }
}
```

## 🚀 IDE Context Streaming Features

### Real-time Data Streams

The extension now captures and streams comprehensive IDE context:

| Data Stream | Description | Use Cases |
|-------------|-------------|-----------|
| **Diagnostics** | Errors, warnings, hints from all sources | Code fixes, debugging assistance |
| **Output Channels** | Build logs, extension output | Build troubleshooting, log analysis |
| **Debug Console** | Debug session output, breakpoint data | Debugging assistance, variable inspection |
| **Terminal** | Command execution, output streams | Command suggestions, script debugging |
| **Tasks** | Build results, test outcomes | CI/CD analysis, build optimization |

### Watcher Configuration

Control which data streams are active:

```json
{
  // Enable/disable specific watchers
  "mcpDiagnostics.watchers.enableOutputChannels": true,
  "mcpDiagnostics.watchers.enableDebugConsole": true,
  "mcpDiagnostics.watchers.enableTerminal": true,
  "mcpDiagnostics.watchers.enableTasks": true
}
```

Changes take effect after reloading the window (`Developer: Reload Window`).

## 🧪 Testing & Development

### Test Coverage Achievement

The extension maintains **world-class testing standards**:

- **✅ 844 Tests Passing** - Comprehensive test suite with 0 failures (1 skipped)
- **✅ 95.55% Statement Coverage** - Exceeding industry standards (95%+ target)
- **✅ 34 Test Suites** - Organized, maintainable test structure
- **✅ Cross-Platform Testing** - Validated on Windows, macOS, and Linux
- **✅ E2E Testing** - Full extension workflow validation

### Development Setup

```bash
# Install dependencies
npm install

# Run tests (844 tests)
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

### Test Workspace

The extension includes `test-workspace/` with intentional errors for testing:

- **`example.ts`**: TypeScript errors (type mismatches, undefined variables)
- **`utils.js`**: ESLint warnings (unused variables, style issues)

## 📚 Documentation

### Core Documentation

- **[Quick Setup Guide](./QUICK_SETUP.md)** - Fast-track installation
- **[MCP Server Guide](./MCP_SERVER_GUIDE.md)** - Comprehensive setup guide
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Common issues and solutions

### Development Documentation

- **[Contributing Guide](./.github/CONTRIBUTING.md)** - Development guidelines
- **[Security Policy](./.github/SECURITY.md)** - Security reporting
- **[Changelog](./CHANGELOG.md)** - Version history

### API Documentation

TypeScript documentation for all public APIs:

- **[DiagnosticsWatcher API](./src/core/diagnostics/)** - Core diagnostic monitoring
- **[MCP Tools API](./src/infrastructure/mcp/)** - MCP server implementation
- **[Extension Commands API](./src/commands/)** - VS Code command integration

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./.github/CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** following our coding standards
4. **Run tests**: `npm test` (all 844 tests must pass)
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

#### Auto-Configuration Failed
1. Check file permissions in user directory
2. Verify MCP client is properly installed
3. Use manual setup guide provided in error notification

For detailed troubleshooting, see our [Troubleshooting Guide](./TROUBLESHOOTING.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **VS Code Team** - For the excellent extension API and diagnostic system
- **Model Context Protocol** - For the innovative protocol enabling AI agent integration
- **TypeScript Team** - For the robust type system and development experience
- **Jest Community** - For the comprehensive testing framework
- **Open Source Community** - For the tools and libraries that make this project possible

---

**🚀 Ready to supercharge your AI-assisted development workflow? Install the MCP Diagnostics Extension today and give your AI agents complete visibility into your codebase health!**

**[Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension) | [View on GitHub](https://github.com/newbpydev/mcp-diagnostics-extension) | [Read the Docs](./docs/)**
```
