# Setting Up MCP Diagnostics Extension with Cursor

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

### Step 2: Test the Standalone MCP Server

Verify the server works correctly:

```bash
node scripts/standalone-mcp-server.js
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
      "args": ["scripts/standalone-mcp-server.js"],
      "cwd": "C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension",
      "env": {
        "NODE_ENV": "production",
        "MCP_DEBUG": "true"
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
1. **Test standalone:** Run `node scripts/standalone-mcp-server.js` manually
2. **Check permissions:** Ensure the script has execute permissions
3. **Verify dependencies:** Run `npm install` in the extension directory
4. **Check environment:** Ensure all environment variables are set correctly

### Issue: "Cannot find module" Errors

**Solutions:**
1. **Install dependencies:** Run `npm install` in the extension directory
2. **Check Node.js version:** Ensure you're using Node.js 16+
3. **Verify paths:** Check that all file paths in the config are absolute and correct

## 📚 Advanced Configuration

### Custom Environment Variables

You can add custom environment variables to the MCP configuration:

```json
{
  "mcpServers": {
    "vscode-diagnostics": {
      "command": "node",
      "args": ["scripts/standalone-mcp-server.js"],
      "cwd": "C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension",
      "env": {
        "NODE_ENV": "production",
        "MCP_DEBUG": "true",
        "CUSTOM_CONFIG": "value"
      }
    }
  }
}
```

### Multiple Workspace Support

For multiple workspaces, you can create separate MCP server instances:

```json
{
  "mcpServers": {
    "vscode-diagnostics-workspace1": {
      "command": "node",
      "args": ["scripts/standalone-mcp-server.js"],
      "cwd": "/path/to/workspace1/mcp-diagnostics-extension"
    },
    "vscode-diagnostics-workspace2": {
      "command": "node",
      "args": ["scripts/standalone-mcp-server.js"],
      "cwd": "/path/to/workspace2/mcp-diagnostics-extension"
    }
  }
}
```

## 🎉 Success!

Once configured correctly, you'll see:
- ✅ MCP server listed in Cursor's MCP Tools settings
- ✅ AI agent can access diagnostic information
- ✅ Real-time problem analysis in your conversations
- ✅ Enhanced coding assistance based on current workspace state

The AI agent will now have access to your workspace's diagnostic information and can provide more informed assistance with debugging, code quality, and problem resolution!
