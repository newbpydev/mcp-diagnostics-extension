# MCP Diagnostics Extension - Server Configuration Guide

## 🎯 Overview

This extension provides **two different ways** to access diagnostic data via MCP:

1. **🔴 Real VS Code Extension** - Gets actual diagnostics from VS Code's Problems panel
2. **🧪 Mock Standalone Server** - Provides simulated diagnostic data for testing

## 🔴 Real VS Code Extension (Recommended)

### How to Use
1. **Open VS Code**
2. **Press F5** to launch Extension Development Host
3. **Open a workspace** with TypeScript/JavaScript files that have errors
4. **View Problems panel** (Ctrl+Shift+M) to see real diagnostics
5. **Use MCP tools** to query the real diagnostic data

### Configuration
The extension automatically registers itself as an MCP server when activated. No additional configuration needed.

### Features
- ✅ **Real-time diagnostics** from VS Code's Problems panel
- ✅ **All diagnostic sources** (TypeScript, ESLint, etc.)
- ✅ **Automatic updates** when problems change
- ✅ **Full workspace support** including multi-root workspaces
- ✅ **Performance optimized** with debouncing and caching

### Status Bar & Commands
- **Status Bar**: Shows real-time error/warning counts
- **Commands**:
  - `MCP Diagnostics: Show Status` - View detailed status
  - `MCP Diagnostics: Restart Server` - Restart the MCP server

## 🧪 Mock Standalone Server (Testing Only)

### How to Use
This is what you've been testing in Cursor and Windsurf. It provides simulated data.

### Configuration Files
- **`cursor-mcp-config.json`** - Cursor IDE configuration (uses mock server)
- **`mcp-server-config.json`** - Alternative configuration (also mock)

### Features
- ⚠️ **Simulated data only** - Not real VS Code diagnostics
- ⚠️ **Static responses** - Data doesn't change with actual code
- ✅ **MCP protocol testing** - Good for testing MCP integration
- ✅ **No VS Code required** - Can run independently

## 📊 Comparison

| Feature | Real Extension | Mock Server |
|---------|---------------|-------------|
| **Data Source** | VS Code Problems Panel | Hardcoded simulation |
| **Real-time Updates** | ✅ Yes | ❌ No |
| **Actual Diagnostics** | ✅ Yes | ❌ No |
| **TypeScript Errors** | ✅ Real errors | 🧪 Simulated |
| **ESLint Warnings** | ✅ Real warnings | 🧪 Simulated |
| **Performance** | ✅ Optimized | ✅ Fast (no processing) |
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
5. **Test MCP tools** - they will return the actual diagnostic data

### 3. Verify Real Data

Real diagnostic responses will include:
- **Actual file paths** from your workspace
- **Real error messages** from TypeScript/ESLint
- **Accurate line/column numbers**
- **Source information** (typescript, eslint, etc.)
- **No "🧪 MOCK" prefixes**

## 🚀 Switching Between Configurations

### For Real Diagnostics (VS Code Extension)
1. Use VS Code Extension Development Host (F5)
2. Extension auto-registers as MCP server
3. No additional configuration needed

### For Mock Testing (Cursor/Windsurf)
1. Uses `cursor-mcp-config.json` configuration
2. Runs `scripts/standalone-mcp-server.js`
3. Provides simulated data with "🧪 MOCK" indicators

## 🔍 Troubleshooting

### "Same problems in different editors"
- **Cause**: You're using the mock server in both Cursor and Windsurf
- **Solution**: Use VS Code Extension Development Host for real diagnostics

### "No problems showing"
- **Cause**: No actual diagnostic errors in the workspace
- **Solution**: Open files with TypeScript/ESLint errors (use test files in `test-workspace/`)

### "Extension not working"
- **Check**: Extension activated successfully (see console logs)
- **Check**: Problems panel has actual diagnostics
- **Check**: MCP server started (see status bar)

## 📝 Summary

- **For REAL diagnostics**: Use VS Code Extension Development Host (F5)
- **For MCP testing**: Use the mock standalone server
- **The mock server clearly indicates** it's providing simulated data
- **Real extension provides** actual VS Code diagnostic data with real-time updates

The extension is working correctly! The "hardcoded" data you saw was from the mock server, not the real extension.
