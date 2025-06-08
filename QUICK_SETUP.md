# Quick Setup: MCP Diagnostics + Cursor

## 🚀 1-Minute Setup

### 1. Create MCP Config File
**Windows:** `C:\Users\Remym\.cursor\mcp.json`
**macOS/Linux:** `~/.cursor/mcp.json`

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

## 🐛 Troubleshooting

**Not working?**
1. Check file path in config is correct
2. Run `npm run compile` in extension directory
3. Restart Cursor completely
4. Test: `node scripts/standalone-mcp-server.js`

**Success indicators:**
- ✅ Server listed in MCP Tools settings
- ✅ AI can access diagnostic tools
- ✅ Real-time problem analysis works
