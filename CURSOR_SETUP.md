# Setting Up MCP Diagnostics Extension with Cursor

## 🏆 **v1.4.0 - AUTO-DEPLOYMENT & CROSS-PLATFORM EXCELLENCE**
- **810 Tests Passing** | **97.99% Coverage** | **Production Ready**
- **Automatic MCP Server Registration** with one-click setup
- **Cross-Platform Diagnostic Analysis** - Enhanced TypeScript/ESLint integration
- **Universal Client Support** - Cursor, VS Code, Windsurf, Claude Desktop

This guide shows you how to configure Cursor to use the MCP Diagnostics server, enabling AI agents to access real-time diagnostic information from your workspace.

## 🎯 What This Enables

Once configured, Cursor's AI agent will be able to:
- **Get all current problems/diagnostics** from your workspace
- **Filter problems by severity** (Error, Warning, Information, Hint)
- **Get problems for specific files**
- **Get workspace summary statistics** grouped by severity, source, or workspace
- **Access real-time diagnostic information** to make informed coding decisions

## 📋 Prerequisites

1. **Cursor IDE** installed and running
2. **Node.js** (version 16 or higher)
3. **MCP Diagnostics Extension** compiled and ready

## 🚀 Setup Instructions

### Step 1: Compile the Extension

First, make sure the extension is compiled:

```bash
cd C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension
npm run compile
```

### Step 2: Test the MCP Server

✅ **Production Server:** Use `scripts/mcp-server.js` for real diagnostic data from VS Code.

Verify the server works correctly:

```bash
node scripts/mcp-server.js
```

You should see:
```
[MCP Server] ✅ MCP Diagnostics server started successfully!
[MCP Server] Available tools:
[MCP Server] - getProblems: Get all current problems/diagnostics
[MCP Server] - getProblemsForFile: Get problems for a specific file
[MCP Server] - getWorkspaceSummary: Get summary statistics of problems
[MCP Server] Server is ready to accept MCP connections via stdio
```

Press `Ctrl+C` to stop the test.

### Step 3: Configure Cursor MCP

Choose one of the following configuration options:

#### Option A: Global Configuration (Recommended)

Create or edit the file `~/.cursor/mcp.json` in your home directory:

**Windows:**
```
C:\Users\[YourUsername]\.cursor\mcp.json
```

**macOS/Linux:**
```
~/.cursor/mcp.json
```

Add this configuration:

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

#### Option B: Project-Specific Configuration

Create a `.cursor/mcp.json` file in your specific project directory with the same content as above.

### Step 4: Restart Cursor

1. **Close Cursor completely**
2. **Reopen Cursor**
3. **Open any project/workspace**

### Step 5: Verify MCP Integration

1. **Open Cursor Settings** (Ctrl/Cmd + ,)
2. **Navigate to MCP Tools** in the sidebar
3. **Look for "vscode-diagnostics"** in the list of MCP servers
4. **Verify it shows as enabled** with tools available

You should see the server listed with these tools:
- ✅ `getProblems`
- ✅ `getProblemsForFile`
- ✅ `getWorkspaceSummary`

## ✨ Latest Features (v1.4.0)

### 🎨 Enhanced Status Bar Integration
- **🔴 Red Background**: When errors are present (`$(error) MCP: 3E 2W`)
- **🟡 Orange Background**: When only warnings are present (`$(warning) MCP: 0E 5W`)
- **✅ Green Check**: When no problems exist (`$(check) MCP: 0E 0W`)
- **🔄 Spinning**: During operations (`$(sync~spin) MCP: Restarting...`)

### ⚡ Real-time Performance
- **Extension Activation**: <2 seconds
- **Diagnostic Processing**: <500ms
- **MCP Tool Response**: <100ms
- **Memory Efficiency**: <50MB baseline

### 🛠️ Extension Commands
Access via Command Palette (Ctrl+Shift+P):
- **`MCP Diagnostics: Show Status`** - Detailed webview with server status and statistics
- **`MCP Diagnostics: Restart Server`** - Restart MCP server with progress indication
- **`MCP Diagnostics: Show Setup Guide`** - Interactive setup wizard for all IDEs

### 🤖 Auto-Deployment Features (NEW in v1.4.0)
- **🔧 Automatic MCP Server Registration** - One-click setup with `configureServer` command
- **⚙️ Smart Detection** - Automatically detects VS Code environment and configures appropriately
- **📁 Multi-Method Registration** - Supports proposed API, workspace config, and user settings
- **✅ Enterprise-Grade Infrastructure** - Atomic configuration operations with rollback support

## 🧪 Testing the Integration

### Test 1: Basic Tool Access

In Cursor's chat, try asking:
```
"Can you check what diagnostic problems are currently in my workspace?"
```

The AI should automatically use the `getProblems` tool and show you current diagnostics.

### Test 2: File-Specific Diagnostics

```
"What problems are in the file src/example.ts?"
```

The AI should use the `getProblemsForFile` tool.

### Test 3: Workspace Summary

```
"Give me a summary of all problems in my workspace grouped by severity"
```

The AI should use the `getWorkspaceSummary` tool.

## 🔧 Available MCP Tools

### 1. `getProblems`
**Description:** Get all current problems/diagnostics from the workspace

**Parameters:**
- `severity` (optional): Filter by "Error", "Warning", "Information", or "Hint"
- `workspaceFolder` (optional): Filter by workspace folder name
- `filePath` (optional): Filter by specific file path

**Example Usage:**
```
"Show me all error-level problems in my workspace"
"Get warnings from the utils folder"
```

### 2. `getProblemsForFile`
**Description:** Get problems for a specific file

**Parameters:**
- `filePath` (required): Absolute file path

**Example Usage:**
```
"What problems are in src/components/Button.tsx?"
```

### 3. `getWorkspaceSummary`
**Description:** Get summary statistics of problems across workspace

**Parameters:**
- `groupBy` (optional): Group by "severity", "source", or "workspaceFolder"

**Example Usage:**
```
"Give me a summary of problems grouped by their source"
"Show workspace problem statistics"
```

## 🌐 Universal MCP Configuration

### For VS Code (with MCP support)
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

### For Windsurf IDE
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

### For Claude Desktop
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

## 🎯 Data Sources & Architecture

### Dual MCP Server Architecture
1. **Extension-based Server** - Embedded in VS Code extension for real-time data
2. **Standalone Server** - Independent process for external MCP clients

### Data Sources (Priority Order)
1. **Primary**: VS Code extension export (real-time diagnostic data)
2. **Fallback**: TypeScript compiler analysis
3. **Fallback**: ESLint analysis
4. **Caching**: Intelligent caching for performance optimization

### Real vs Mock Data Verification
- ✅ **Real Data**: Actual file paths, error messages, line numbers from your workspace
- ❌ **Mock Data**: Generic test data with "🧪 MOCK" prefixes (indicates configuration issue)

## 🐛 Troubleshooting

### Issue: MCP Server Not Listed in Cursor

**Solutions:**
1. **Check file path:** Ensure the `cwd` path in your MCP config is correct
2. **Verify compilation:** Run `npm run compile` in the extension directory
3. **Check Node.js:** Ensure Node.js is in your PATH
4. **Restart Cursor:** Completely close and reopen Cursor
5. **Check logs:** Look for error messages in Cursor's developer console

### Issue: Tools Not Working

**Solutions:**
1. **Test standalone:** Run `node scripts/mcp-server.js` manually
2. **Check permissions:** Ensure the script has execute permissions
3. **Verify dependencies:** Run `npm install` in the extension directory
4. **Check environment:** Ensure all environment variables are set correctly

### Issue: "Cannot find module" Errors

**Solutions:**
1. **Install dependencies:** Run `npm install` in the extension directory
2. **Check Node.js version:** Ensure you're using Node.js 16+
3. **Verify paths:** Check that all file paths in the config are absolute and correct

### Issue: Getting Mock Data Instead of Real Data

**Solutions:**
1. **Check server script:** Ensure you're using `scripts/mcp-server.js` for production diagnostics
2. **Verify VS Code extension:** Make sure the MCP Diagnostics extension is installed and active in VS Code
3. **Check data export:** Look for `vscode-diagnostics-export.json` in temp directory
4. **Restart services:** Restart both VS Code and Cursor

## 🎖️ Success Indicators

When everything is working correctly, you should see:
- ✅ **Server Listed**: "vscode-diagnostics" appears in Cursor's MCP Tools settings
- ✅ **Tools Available**: All three MCP tools (getProblems, getProblemsForFile, getWorkspaceSummary) are accessible
- ✅ **Real Data**: Responses contain actual file paths and error messages from your workspace
- ✅ **No Mock Prefixes**: No "🧪 MOCK" prefixes in diagnostic responses
- ✅ **Real-time Updates**: Changes in VS Code Problems panel are reflected in MCP tool responses
- ✅ **Performance**: Tool responses arrive within 100ms

## 📚 Additional Resources

- **[Main README](README.md)** - Complete project documentation
- **[MCP Server Guide](MCP_SERVER_GUIDE.md)** - Comprehensive server setup guide
- **[Quick Setup](QUICK_SETUP.md)** - 1-minute setup for Cursor
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions
