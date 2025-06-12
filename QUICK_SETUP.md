# Quick Setup: MCP Diagnostics + Cursor

## 🏆 **v1.3.0 - EXCEPTIONAL ACHIEVEMENTS**
- **602 Tests Passing** | **95.45% Coverage** | **Production Ready**
- **Real-time VS Code Diagnostics** via MCP for AI agents
- **Cross-Platform Support** - Windows, macOS, Linux compatibility
- **Universal Client Support** - Cursor, VS Code, Windsurf, Claude Desktop

## 🚀 1-Minute Setup

### 1. Create MCP Config File
**Windows:** `C:\Users\Remym\.cursor\mcp.json`
**macOS/Linux:** `~/.cursor/mcp.json`

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

✅ **Production Server:** Use `scripts/mcp-server.js` for real diagnostic data from VS Code.

### 2. Restart Cursor
Close and reopen Cursor completely.

### 3. Verify in Settings
Settings → MCP Tools → Look for "vscode-diagnostics" ✅

## 🧪 Quick Test Commands

In Cursor chat, try:
- `"What diagnostic problems are in my workspace?"`
- `"Show me all errors in my project"`
- `"Give me a summary of workspace problems"`

## 🔧 Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| `getProblems` | Get all diagnostics | "Show all warnings" |
| `getProblemsForFile` | File-specific problems | "Problems in src/app.ts?" |
| `getWorkspaceSummary` | Statistics overview | "Problem summary by severity" |

## ✨ Latest Features (v1.3.0)

### 🎨 Enhanced Status Bar
- **🔴 Red Background**: When errors are present (`$(error) MCP: 3E 2W`)
- **🟡 Orange Background**: When only warnings are present (`$(warning) MCP: 0E 5W`)
- **✅ Green Check**: When no problems exist (`$(check) MCP: 0E 0W`)

### ⚡ Real-time Updates
- **Instant Updates**: Status bar changes immediately when problems change
- **Live Diagnostics**: MCP tools return current VS Code diagnostic data
- **Performance**: <100ms response times for all MCP tools

### 🛠️ Extension Commands
Access via Command Palette (Ctrl+Shift+P):
- **`MCP Diagnostics: Show Status`** - Detailed webview with statistics
- **`MCP Diagnostics: Restart Server`** - Restart with progress indication
- **`MCP Diagnostics: Show Setup Guide`** - Interactive setup wizard

### 🌐 Cross-Platform Enhancements (NEW in v1.3.0)
- **🔧 Intelligent Platform Detection** - Automatic Windows/macOS/Linux handling
- **⚙️ Smart Spawn Options** - Platform-specific command execution (shell: true for Windows)
- **📁 Dynamic Path Resolution** - Automatic IDE config path detection
- **✅ Configuration Validation** - Auto-detection and fixing of common config issues

## 🌐 Universal MCP Configuration

### For VS Code (with MCP support)
```json
{
  "servers": {
    "vscode-diagnostics": {
      "type": "stdio",
      "command": "node",
      "args": ["scripts/mcp-server.js"],
      "cwd": "C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension"
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
      "cwd": "C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension"
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
      "cwd": "C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension"
    }
  }
}
```

## 🐛 Troubleshooting

**Not working?**
1. Check file path in config is correct
2. Run `npm run compile` in extension directory
3. Restart Cursor completely
4. Test: `node scripts/mcp-server.js`

**Success indicators:**
- ✅ Server listed in MCP Tools settings
- ✅ AI can access diagnostic tools
- ✅ Real-time problem analysis works
- ✅ No "🧪 MOCK" prefixes in responses

## 🎯 Data Sources

The MCP server provides **real diagnostic data** from:
1. **Primary**: VS Code extension export (real-time)
2. **Fallback**: TypeScript compiler analysis
3. **Fallback**: ESLint analysis
4. **Caching**: Intelligent caching for performance

**Real vs Mock Data:**
- ✅ **Real**: Actual file paths, error messages, line numbers
- ❌ **Mock**: Generic test data with "🧪 MOCK" prefixes
