# 🚀 MCP Diagnostics Extension - Complete Setup Guide

## 🏆 **v1.4.0 - AUTO-DEPLOYMENT & CROSS-PLATFORM EXCELLENCE**
- **810 Tests Passing** | **97.99% Coverage** | **Production Ready**
- **Automatic MCP Server Registration** with one-click setup
- **Cross-Platform Diagnostic Analysis** - Enhanced TypeScript/ESLint integration
- **Universal Client Support** - Cursor, VS Code, Windsurf, Claude Desktop

## 🎯 Overview

This extension provides **real VS Code diagnostic data** via MCP (Model Context Protocol) for AI agents in Cursor, Claude Desktop, and other MCP-enabled tools.

**Current Version:** v1.4.0 | **Tests:** 810 passing (1 skipped) | **Status:** Production Ready
**✅ Production Server:** Use `scripts/mcp-server.js` for real diagnostic data from VS Code.

## 🔴 Architecture Overview

### How It Works
1. **VS Code Extension** - Monitors diagnostic changes and exports data continuously
2. **Standalone MCP Server** - Reads exported data and serves it via MCP protocol
3. **MCP Clients** - Connect to standalone server and access diagnostic tools

### Key Files
- **Extension:** `src/extension.ts` - Monitors VS Code diagnostics
- **MCP Server:** `scripts/mcp-server.js` - Serves diagnostic data via MCP
- **Data Bridge:** Temp file `vscode-diagnostics-export.json` - Real-time data transfer

## ✨ Latest Features (v1.4.0)

### 🤖 **AUTO-DEPLOYMENT & ENHANCED TESTING EXCELLENCE**
- **810 Tests Passing** (1 skipped, 0 failures) - Unprecedented reliability
- **97.99% Statement Coverage** - World-class quality standards
- **46 Test Suites** - Comprehensive component and E2E coverage
- **Automatic MCP Registration** - One-click setup automation
- **1.4MB Package** - Enhanced features with optimized performance

### 🎨 Enhanced Status Bar Integration
- **🔴 Red Background**: When errors are present (`$(error) MCP: 3E 2W`)
- **🟡 Orange Background**: When only warnings are present (`$(warning) MCP: 0E 5W`)
- **✅ Green Check**: When no problems exist (`$(check) MCP: 0E 0W`)
- **🔄 Spinning**: During operations (`$(sync~spin) MCP: Restarting...`)

### ⚡ Real-time Performance Achievements
- **Extension Activation**: <2 seconds (target met)
- **Diagnostic Processing**: <500ms (target exceeded)
- **MCP Tool Response**: <100ms (target exceeded)
- **Memory Efficiency**: <50MB baseline (target exceeded)

### 🛠️ Enhanced Extension Commands
Access via Command Palette (Ctrl+Shift+P):
- **`MCP Diagnostics: Show Status`** - Detailed webview with server status, problem statistics, and file breakdown
- **`MCP Diagnostics: Restart Server`** - Restarts MCP server with progress indication
- **`MCP Diagnostics: Show Setup Guide`** - Interactive setup wizard for all IDEs

### 🤖 Auto-Deployment Revolution (NEW in v1.4.0)
- **Automatic MCP Server Registration** - One-click setup via `configureServer` command
- **Smart Environment Detection** - Automatically detects VS Code environment and configures appropriately
- **Multi-Method Registration** - Supports proposed API, workspace config, and user settings
- **Enterprise-Grade Infrastructure** - Atomic configuration operations with rollback support
- **Server Installation Utilities** - Version management and dependency checking
- **Enhanced Command System** - Intuitive commands for configuration and management
- **Cross-Platform Diagnostic Analysis** - Enhanced TypeScript/ESLint server integration

## 🚀 Quick Setup

### Step 1: Install Extension
**Option A: VS Code Marketplace**
- Search for "MCP Diagnostics Extension" by newbpydev
- Click Install and reload VS Code

**Option B: Development**
- Open this project in VS Code
- Press **F5** to launch Extension Development Host

### Step 2: Configure MCP Client

#### For VS Code (with MCP support)
The extension automatically creates `.vscode/mcp.json`:
```json
{
  "servers": {
    "vscode-diagnostics": {
      "type": "stdio",
      "command": "node",
      "args": ["scripts/mcp-server.js"],
      "cwd": "C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension",
      "env": {
        "NODE_ENV": "production",
        "MCP_DEBUG": "false"
      }
    }
  }
}
```

#### For Cursor IDE
Update your `cursor-mcp-config.json` or `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "vscode-diagnostics": {
      "command": "node",
      "args": ["scripts/mcp-server.js"],
      "cwd": "C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension",
      "env": {
        "NODE_ENV": "production",
        "MCP_DEBUG": "false"
      }
    }
  }
}
```

#### For Windsurf IDE
Create `.windsurf/mcp.json`:
```json
{
  "servers": {
    "vscode-diagnostics": {
      "command": "node",
      "args": ["scripts/mcp-server.js"],
      "cwd": "C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension",
      "env": {
        "NODE_ENV": "production",
        "MCP_DEBUG": "false"
      }
    }
  }
}
```

#### For Claude Desktop
Update your Claude Desktop configuration:
```json
{
  "mcpServers": {
    "vscode-diagnostics": {
      "command": "node",
      "args": ["scripts/mcp-server.js"],
      "cwd": "C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension",
      "env": {
        "NODE_ENV": "production",
        "MCP_DEBUG": "false"
      }
    }
  }
}
```

### Step 3: Verify Setup
1. **Restart your MCP-enabled IDE** (Cursor, Claude Desktop, etc.)
2. **Open a workspace with TypeScript/JavaScript files**
3. **Check Problems panel** (Ctrl+Shift+M) for real diagnostics
4. **Test MCP tools** - Ask AI: "What diagnostic problems are in my workspace?"

## 🔧 Available MCP Tools

### 1. `getProblems` - Get All Diagnostics
```javascript
// Returns all current problems from VS Code
{
  "severity": "Error",        // Filter by: Error, Warning, Information, Hint
  "workspaceFolder": "src",   // Filter by workspace folder
  "filePath": "/path/file.ts" // Filter by specific file
}
```

### 2. `getProblemsForFile` - File-Specific Diagnostics
```javascript
// Returns problems for a specific file
{
  "filePath": "/absolute/path/to/file.ts" // Required: absolute path
}
```

### 3. `getWorkspaceSummary` - Workspace Statistics
```javascript
// Returns summary statistics
{
  "groupBy": "severity" // Group by: severity, source, workspaceFolder
}
```

## ⚙️ Configuration Options

Customize via VS Code Settings (Ctrl+,):

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

## 🎯 Data Sources & Architecture

### Dual MCP Server Architecture
1. **Extension-based Server** - Embedded in VS Code extension for real-time data
2. **Standalone Server** - Independent process for external MCP clients

### Data Sources (Priority Order)
1. **Primary**: VS Code extension export (real-time diagnostic data)
2. **Fallback**: TypeScript compiler analysis
3. **Fallback**: ESLint analysis
4. **Caching**: Intelligent caching for performance optimization

### MCP Server Features
- **Real-time Diagnostics**: Live updates from VS Code Problems panel
- **Performance Optimization**: <100ms response times with intelligent caching
- **Error Recovery**: Graceful fallback to TypeScript/ESLint analysis
- **Cross-platform**: Windows, macOS, Linux support

## 🧪 Testing Real Diagnostics

### Create Test Files with Errors

**`test-workspace/example.ts`** - TypeScript errors:
```typescript
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "John",
  age: "25" // Error: Type 'string' is not assignable to type 'number'
};

console.log(user.email); // Error: Property 'email' does not exist on type 'User'
```

**`test-workspace/utils.js`** - ESLint warnings:
```javascript
const unusedVar = "This variable is never used"; // Warning: no-unused-vars
console.log(undefinedGlobal); // Error: no-undef
```

### Verify Real Data

Real diagnostic responses include:
- **Actual file paths** from your workspace
- **Real error messages** from TypeScript/ESLint
- **Accurate line/column numbers**
- **Source information** (typescript, eslint, etc.)
- **No "🧪 MOCK" prefixes**
- **Real-time updates** when you fix/create problems

## 🔍 Troubleshooting

### Issue: MCP Server Not Listed

**Solutions:**
1. **Check file path:** Ensure the `cwd` path in your MCP config is correct
2. **Verify compilation:** Run `npm run compile` in the extension directory
3. **Check Node.js:** Ensure Node.js is in your PATH
4. **Restart IDE:** Completely close and reopen your MCP-enabled IDE

### Issue: Getting Mock Data Instead of Real Data

**Solutions:**
1. **Check server script:** Ensure you're using `scripts/mcp-server.js` for production diagnostics
2. **Verify VS Code extension:** Make sure the MCP Diagnostics extension is installed and active in VS Code
3. **Check data export:** Look for `vscode-diagnostics-export.json` in temp directory
4. **Restart services:** Restart both VS Code and your MCP client

### Issue: Tools Not Working

**Solutions:**
1. **Test standalone:** Run `node scripts/mcp-server.js` manually
2. **Check permissions:** Ensure the script has execute permissions
3. **Verify dependencies:** Run `npm install` in the extension directory
4. **Check environment:** Ensure all environment variables are set correctly

## 🎖️ Success Indicators

When everything is working correctly, you should see:
- ✅ **Server Listed**: "vscode-diagnostics" appears in your MCP client's server list
- ✅ **Tools Available**: All three MCP tools are accessible
- ✅ **Real Data**: Responses contain actual file paths and error messages from your workspace
- ✅ **No Mock Prefixes**: No "🧪 MOCK" prefixes in diagnostic responses
- ✅ **Real-time Updates**: Changes in VS Code Problems panel are reflected in MCP tool responses
- ✅ **Performance**: Tool responses arrive within 100ms

## 📚 Additional Resources

- **[Main README](README.md)** - Complete project documentation with achievements
- **[Quick Setup](QUICK_SETUP.md)** - 1-minute setup for Cursor
- **[Cursor Setup](CURSOR_SETUP.md)** - Detailed Cursor configuration guide
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions
- **[GitHub Repository](https://github.com/newbpydev/mcp-diagnostics-extension)** - Source code and releases

## 🎉 Success!

Once configured correctly, you'll have:
- ✅ **Real-time diagnostic access** for AI agents
- ✅ **Enhanced coding assistance** based on current workspace state
- ✅ **Intelligent problem analysis** and suggestions
- ✅ **Seamless integration** with your development workflow

The AI agent will now have access to your workspace's diagnostic information and can provide more informed assistance with debugging, code quality, and problem resolution!
