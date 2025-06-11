# 🚀 MCP Diagnostics Extension - Complete Setup Guide

## 🎯 Overview

This extension provides **real VS Code diagnostic data** via MCP (Model Context Protocol) for AI agents in Cursor, Claude Desktop, and other MCP-enabled tools.

**Current Version:** v1.2.10 | **Tests:** 336+ passing | **Status:** Production Ready
**⚠️ IMPORTANT:** Use `scripts/mcp-server.js` (NOT `scripts/standalone-mcp-server.js`) for real diagnostic data.

## 🔴 Architecture Overview

### How It Works
1. **VS Code Extension** - Monitors diagnostic changes and exports data continuously
2. **Standalone MCP Server** - Reads exported data and serves it via MCP protocol
3. **MCP Clients** - Connect to standalone server and access diagnostic tools

### Key Files
- **Extension:** `src/extension.ts` - Monitors VS Code diagnostics
- **MCP Server:** `scripts/mcp-server.js` - Serves diagnostic data via MCP
- **Data Bridge:** Temp file `vscode-diagnostics-export.json` - Real-time data transfer

## ✨ Latest Features (v1.2.10)
- **🎨 Enhanced Status Bar**: Color-coded status with red (errors), orange (warnings), green (clean)
- **⚡ Real-time Updates**: Instant status bar updates when problems change
- **🔧 Improved Commands**: Enhanced restart and status viewing with progress indicators
- **🛡️ Robust Error Handling**: Graceful degradation and comprehensive error recovery
- **🌐 Cross-Platform Support**: Works in VS Code, Cursor, and Windsurf

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

## 🎨 Status Bar Integration

The extension provides visual feedback in VS Code:

- **🔴 Red Background**: When errors are present (`$(error) MCP: 3E 2W`)
- **🟡 Orange Background**: When only warnings are present (`$(warning) MCP: 0E 5W`)
- **✅ Green Check**: When no problems exist (`$(check) MCP: 0E 0W`)
- **🔄 Spinning**: During operations (`$(sync~spin) MCP: Restarting...`)

## 🛠️ Extension Commands

Access via Command Palette (Ctrl+Shift+P):

- **`MCP Diagnostics: Show Status`** - Detailed webview with server status, problem statistics, and file breakdown
- **`MCP Diagnostics: Restart Server`** - Restarts MCP server with progress indication
- **`MCP Diagnostics: Show Setup Guide`** - Interactive setup wizard for all IDEs

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

### Issue: MCP Tools Not Working

**Check 1: Configuration Path**
```bash
# Verify the extension path in your MCP config
cd "C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension"
node scripts/mcp-server.js
# Should show: "[Real MCP Server] ✅ REAL MCP Diagnostics server started successfully!"
```

**Check 2: Data Export**
```bash
# Check if VS Code extension is exporting data
# Look for: %TEMP%/vscode-diagnostics-export.json (Windows)
# Or: /tmp/vscode-diagnostics-export.json (Mac/Linux)
```

**Check 3: VS Code Extension Active**
- Open VS Code with workspace containing errors
- Check Extension Host Output for "[MCP Diagnostics]" logs
- Verify status bar shows problem counts

### Issue: "No server info found"

**Solution 1: Restart MCP Client**
- Completely close Cursor/Claude Desktop
- Reopen and test MCP tools

**Solution 2: Check Configuration**
```json
// Ensure your config uses absolute path
"cwd": "C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension"
```

**Solution 3: Verify Script Exists**
```bash
# Check the server script exists
ls "C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension/scripts/mcp-server.js"
```

### Issue: Only Mock Data

**Fix: Use Correct Server Script**
- ✅ Use: `scripts/mcp-server.js` (Real diagnostics)
- ❌ Avoid: `scripts/standalone-mcp-server.js` (Mock data)

## 🎯 Best Practices

### For Development
1. **Use F5 Extension Development Host** for testing
2. **Monitor Extension Host Output** for debug logs
3. **Check VS Code Problems panel** for real diagnostics
4. **Test MCP tools frequently** to ensure data freshness

### For Production
1. **Install from VS Code Marketplace** for stability
2. **Use absolute paths** in MCP configurations
3. **Enable debug logging** initially, disable after setup
4. **Restart MCP clients** after configuration changes

### For Cross-Platform Use
1. **Normalize file paths** (forward slashes in JSON)
2. **Use environment variables** for user-specific paths
3. **Test on target platform** before deployment
4. **Document platform-specific differences**

## 📊 Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| **Real-time diagnostics** | ✅ | Live data from VS Code Problems panel |
| **All diagnostic sources** | ✅ | TypeScript, ESLint, custom linters, etc. |
| **Cross-platform support** | ✅ | Windows, macOS, Linux |
| **Multiple IDE support** | ✅ | VS Code, Cursor, Windsurf |
| **Visual status feedback** | ✅ | Color-coded status bar |
| **Interactive commands** | ✅ | Status viewer, restart, setup guide |
| **Performance optimized** | ✅ | 300ms debouncing, smart caching |
| **Robust error handling** | ✅ | Graceful degradation |
| **Auto-configuration** | ✅ | One-click setup for all IDEs |

---

**📋 This extension provides the most comprehensive VS Code diagnostic integration available for MCP-enabled AI tools, with real-time updates and cross-platform compatibility.**

## 🔗 Additional Resources

- **[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)** - Install the extension
- **[GitHub Repository](https://github.com/newbpydev/mcp-diagnostics-extension)** - Source code and issues
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Detailed troubleshooting
- **[Contributing Guide](./CONTRIBUTING.md)** - Development guidelines
- **[Changelog](./CHANGELOG.md)** - Version history and release notes
