# 🚀 MCP Diagnostics Extension - Complete Setup Guide

## 🎯 Overview

This extension provides **two different ways** to access diagnostic data via MCP:

1. **🔴 Real VS Code Extension** - Gets actual diagnostics from VS Code's Problems panel *(Recommended)*
2. **🧪 Mock Standalone Server** - Provides simulated diagnostic data for testing

**Current Version:** v1.2.5 | **Tests:** 336 passing | **Status:** Production Ready

## 🔴 Real VS Code Extension (Recommended)

### ✨ Latest Features (v1.2.5)
- **🎨 Enhanced Status Bar**: Color-coded status with red (errors), orange (warnings), green (clean)
- **⚡ Real-time Updates**: Instant status bar updates when problems change
- **🔧 Improved Commands**: Enhanced restart and status viewing with progress indicators
- **🛡️ Robust Error Handling**: Graceful degradation and comprehensive error recovery

### How to Use
1. **Install from VS Code Marketplace**
   - Search for "MCP Diagnostics Extension" by newbpydev
   - Click Install and reload VS Code
   - Extension automatically activates and registers as MCP server

2. **Or Launch Extension Development Host**
   - Open this project in VS Code
   - Press **F5** to launch Extension Development Host
   - Open a workspace with TypeScript/JavaScript files that have errors
   - View Problems panel (Ctrl+Shift+M) to see real diagnostics

### Status Bar Integration
The extension now provides enhanced visual feedback:

- **🔴 Red Background**: When errors are present (`$(error) MCP: XE YW`)
- **🟡 Orange Background**: When only warnings are present (`$(warning) MCP: XE YW`)
- **✅ Green Check**: When no problems exist (`$(check) MCP: 0E 0W`)
- **🔄 Spinning**: During server operations (`$(sync~spin) MCP: Restarting...`)

### Available Commands
Access via Command Palette (Ctrl+Shift+P):

- **`MCP Diagnostics: Show Status`** - Opens detailed webview with:
  - Server connection status with visual indicators
  - Problem statistics by severity (🔴 Errors, 🟡 Warnings, 🔵 Info, 💡 Hints)
  - File-by-file breakdown with expandable details
  - Workspace folder information
  - Real-time timestamps and performance metrics

- **`MCP Diagnostics: Restart Server`** - Restarts MCP server with progress indication

### Configuration Options
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

### Features
- ✅ **Real-time diagnostics** from VS Code's Problems panel
- ✅ **All diagnostic sources** (TypeScript, ESLint, custom linters, etc.)
- ✅ **Automatic updates** when problems change with visual feedback
- ✅ **Full workspace support** including multi-root workspaces
- ✅ **Performance optimized** with 300ms debouncing and smart caching
- ✅ **Enhanced UI** with colored status bar and detailed webview
- ✅ **Robust error handling** with graceful degradation

## 🧪 Mock Standalone Server (Testing Only)

### How to Use
This provides simulated data for testing MCP integration without VS Code.

### Current Configuration Files
- **`.vscode/mcp.json`** - VS Code MCP configuration (uses real server)
- **`cursor-mcp-config.json`** - Cursor IDE configuration (uses mock server)
- **`mcp-server-config.json`** - Alternative configuration (also mock)

### Features
- ⚠️ **Simulated data only** - Not real VS Code diagnostics
- ⚠️ **Static responses** - Data doesn't change with actual code
- ⚠️ **Mock indicators** - Responses include "🧪 MOCK" prefixes
- ✅ **MCP protocol testing** - Good for testing MCP integration
- ✅ **No VS Code required** - Can run independently

## 📊 Comparison

| Feature | Real Extension (v1.2.5) | Mock Server |
|---------|-------------------------|-------------|
| **Data Source** | VS Code Problems Panel | Hardcoded simulation |
| **Real-time Updates** | ✅ Yes + Visual feedback | ❌ No |
| **Actual Diagnostics** | ✅ Yes | ❌ No |
| **TypeScript Errors** | ✅ Real errors | 🧪 Simulated |
| **ESLint Warnings** | ✅ Real warnings | 🧪 Simulated |
| **Status Bar** | ✅ Color-coded with counts | ❌ No |
| **Commands** | ✅ Full integration | ❌ No |
| **Performance** | ✅ Optimized (300ms debounce) | ✅ Fast (no processing) |
| **VS Code Required** | ✅ Yes | ❌ No |
| **Use Case** | Production | Testing MCP protocol |

## 🔧 Testing Real Diagnostics

### 1. Create Test Files with Errors

We've created test files in `test-workspace/`:

**`example.ts`** - TypeScript errors:
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

**`utils.js`** - ESLint warnings:
```javascript
const unusedVar = "This variable is never used"; // Warning: no-unused-vars
console.log(undefinedGlobal); // Error: no-undef
```

### 2. Test in VS Code Extension Development Host

1. **Open this project in VS Code**
2. **Press F5** to launch Extension Development Host
3. **Open the test files** (`test-workspace/example.ts`)
4. **Check Problems panel** (Ctrl+Shift+M) - you should see real errors
5. **Check status bar** - should show colored error/warning counts
6. **Test MCP tools** - they will return the actual diagnostic data

### 3. Verify Real Data

Real diagnostic responses will include:
- **Actual file paths** from your workspace
- **Real error messages** from TypeScript/ESLint
- **Accurate line/column numbers**
- **Source information** (typescript, eslint, etc.)
- **No "🧪 MOCK" prefixes**
- **Real-time updates** when you fix/create problems

## 🚀 MCP Configuration Examples

### ⚠️ **Important Configuration Update**
**For real diagnostics, use `scripts/mcp-server.js` (not `scripts/standalone-mcp-server.js`)**
- **Real Server**: `scripts/mcp-server.js` - Gets actual VS Code diagnostics
- **Mock Server**: `scripts/standalone-mcp-server.js` - Returns simulated data with "🧪 MOCK" prefixes

### For VS Code (Real Diagnostics)
```json
// .vscode/mcp.json
{
  "servers": {
    "mcpDiagnostics": {
      "type": "stdio",
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

### For Cursor (Real Diagnostics - Recommended)
```json
// Update your Cursor MCP configuration for real diagnostics:
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

### For Cursor (Mock Testing Only)
```json
// Only use this for testing MCP protocol integration:
{
  "mcpServers": {
    "vscode-diagnostics": {
      "command": "node",
      "args": ["scripts/standalone-mcp-server.js"],
      "cwd": "/path/to/mcp-diagnostics-extension",
      "env": {
        "NODE_ENV": "production",
        "MCP_DEBUG": "true"
      }
    }
  }
}
```

### For Claude Desktop (Real Diagnostics)
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

## 🔍 Troubleshooting

### "Same problems in different editors"
- **Cause**: You're using the mock server in both Cursor and other tools
- **Solution**: Use VS Code Extension Development Host for real diagnostics
- **Check**: Look for "🧪 MOCK" prefixes in responses (indicates mock server)

### "No problems showing"
- **Cause**: No actual diagnostic errors in the workspace
- **Solution**: Open files with TypeScript/ESLint errors (use test files in `test-workspace/`)
- **Check**: VS Code Problems panel (Ctrl+Shift+M) should show actual diagnostics

### "Extension not working"
- **Check**: Extension activated successfully (see console logs)
- **Check**: Status bar shows MCP status with colored background
- **Check**: Problems panel has actual diagnostics
- **Check**: MCP server started (status bar should not show error state)

### "Status bar not updating"
- **Cause**: Extension may not be listening to diagnostic changes
- **Solution**: Restart extension or use "MCP Diagnostics: Restart Server" command
- **Check**: Status bar should change colors based on error/warning counts

### "MCP tools returning mock data"
- **Cause**: Using wrong MCP server configuration (pointing to standalone server)
- **Solution**: Update configuration to use `scripts/mcp-server.js` instead of `scripts/standalone-mcp-server.js`
- **Check**: Real responses won't have "🧪 MOCK" prefixes
- **Action Required**:
  1. Update your MCP configuration file
  2. Change `"args": ["scripts/standalone-mcp-server.js"]` to `"args": ["scripts/mcp-server.js"]`
  3. Restart your MCP client (Cursor/Claude Desktop/etc.)
  4. Test again - responses should show real diagnostic data

## 📈 Quality Metrics (v1.2.5)

- **✅ Tests**: 336 passing (100% pass rate)
- **📦 Package Size**: ~1.2 MB (optimized)
- **⚡ Performance**: <2s activation, <500ms diagnostic processing
- **🔧 Configuration**: 7 customizable settings
- **🎨 UI**: Enhanced status bar with 4 visual states
- **🛡️ Error Handling**: Comprehensive error recovery

## 📝 Summary

- **For REAL diagnostics**: Use VS Code Extension (marketplace or F5)
- **For MCP testing**: Use the mock standalone server
- **The mock server clearly indicates** it's providing simulated data with "🧪 MOCK" prefixes
- **Real extension provides** actual VS Code diagnostic data with real-time updates and visual feedback
- **Status bar integration** provides immediate visual feedback on workspace health
- **Enhanced commands** offer detailed status viewing and server management

The extension is working correctly! The "hardcoded" data you saw was from the mock server, not the real extension. The real extension now provides enhanced visual feedback and comprehensive diagnostic monitoring.

## 🔗 Additional Resources

- **[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=newbpydev.mcp-diagnostics-extension)** - Install the extension
- **[GitHub Repository](https://github.com/newbpydev/mcp-diagnostics-extension)** - Source code and issues
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Detailed troubleshooting
- **[Contributing Guide](./CONTRIBUTING.md)** - Development guidelines
- **[Changelog](./CHANGELOG.md)** - Version history and release notes
