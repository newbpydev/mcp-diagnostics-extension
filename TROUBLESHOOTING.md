# MCP Diagnostics Extension - Troubleshooting Guide

This guide helps resolve common issues with the MCP Diagnostics Extension, specifically focusing on command registration problems.

## 🚨 Common Issue: Commands Not Found

If you see errors like:
- `command 'mcpDiagnostics.showStatus' not found`
- `command 'mcpDiagnostics.restart' not found`

### 📋 Step-by-Step Diagnostics

#### 1. Verify Extension Installation

1. **Open Command Palette**: `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. **Type**: `Extensions: Show Installed Extensions`
3. **Look for**: "MCP Diagnostics Server" by newbpydev
4. **Check status**: Ensure it's enabled (not disabled)

#### 2. Check Extension Activation

1. **Open Developer Tools**: `Help > Toggle Developer Tools`
2. **Go to Console tab**
3. **Look for activation messages**:
   ```
   🚀 MCP Diagnostics Extension: STARTING ACTIVATION...
   🚀 Extension context: true
   🚀 VS Code API available: true
   🎉 MCP Diagnostics Extension activated successfully in Xms
   ```

#### 3. Check for Activation Errors

In the Developer Tools Console, look for error messages like:
- `❌ Failed to activate extension:`
- Module resolution errors
- Permission errors
- Port binding errors

#### 4. Force Extension Activation

1. **Open Command Palette**: `Ctrl+Shift+P`
2. **Type**: `Developer: Reload Window`
3. **Press Enter** to reload the window
4. **Watch for activation messages** in Developer Tools

#### 5. Check Extension Host

1. **Open Command Palette**: `Ctrl+Shift+P`
2. **Type**: `Developer: Show Running Extensions`
3. **Look for**: "mcp-diagnostics-extension" in the list
4. **Check status**: Should show "Activated"

#### 6. Manually Trigger Activation

If the extension isn't activating automatically:

1. **Open Command Palette**: `Ctrl+Shift+P`
2. **Type**: `Developer: Activate Extension`
3. **Select**: "mcp-diagnostics-extension"

### 🔧 Common Solutions

#### Solution 1: Reinstall Extension

1. **Uninstall**:
   - Open Extensions view (`Ctrl+Shift+X`)
   - Find "MCP Diagnostics Server"
   - Click gear icon → Uninstall
   - **Reload window**: `Ctrl+Shift+P` → "Developer: Reload Window"

2. **Reinstall**:
   - Install from VSIX: `code --install-extension mcp-diagnostics-extension-1.0.2.vsix`
   - Or from marketplace: Search "MCP Diagnostics Server"

#### Solution 2: Clear Extension Cache

1. **Close VS Code/Cursor completely**
2. **Delete extension cache** (location varies by OS):
   - **Windows**: `%USERPROFILE%\.vscode\extensions`
   - **macOS**: `~/.vscode/extensions`
   - **Linux**: `~/.vscode/extensions`
3. **Restart VS Code/Cursor**
4. **Reinstall extension**

#### Solution 3: Check Permissions

Ensure VS Code/Cursor has permission to:
- Read/write files in the workspace
- Bind to network ports (for MCP server)
- Execute Node.js processes

#### Solution 4: Port Conflict Resolution

If you see port binding errors:

1. **Open settings**: `Ctrl+,` (or `Cmd+,`)
2. **Search**: "mcp diagnostics port"
3. **Change port**: Set `mcpDiagnostics.server.port` to a different value (e.g., 6071)
4. **Reload window**: `Ctrl+Shift+P` → "Developer: Reload Window"

### 🐛 Advanced Debugging

#### Check Extension Logs

1. **Open Command Palette**: `Ctrl+Shift+P`
2. **Type**: `Developer: Open Extension Host Output`
3. **Look for**: "mcp-diagnostics-extension" entries
4. **Check for**: Error messages or stack traces

#### Enable Debug Logging

1. **Open settings**: `Ctrl+,`
2. **Search**: "mcp diagnostics debug"
3. **Enable**: `mcpDiagnostics.enableDebugLogging`
4. **Reload window** and check console output

#### Manual Command Registration Test

Open Developer Tools Console and test:

```javascript
// Check if commands are registered
vscode.commands.getCommands().then(commands => {
  const mcpCommands = commands.filter(cmd => cmd.startsWith('mcpDiagnostics'));
  console.log('MCP Commands found:', mcpCommands);
});
```

### 🔍 Cursor-Specific Issues

Since you're using Cursor (VS Code fork):

#### 1. Extension Compatibility
- Cursor may have different extension loading behavior
- Try installing in regular VS Code to compare

#### 2. API Differences
- Some VS Code APIs might behave differently in Cursor
- Check Cursor's extension compatibility documentation

#### 3. Alternative Activation
Try adding these activation events to force activation:
```json
"activationEvents": [
  "*",
  "onStartupFinished",
  "onCommand:mcpDiagnostics.restart",
  "onCommand:mcpDiagnostics.showStatus"
]
```

### 📞 Getting Help

If none of these solutions work:

1. **Gather information**:
   - VS Code/Cursor version
   - Operating system
   - Extension version
   - Console error messages
   - Extension Host output

2. **Create an issue**: [GitHub Issues](https://github.com/newbpydev/mcp-diagnostics-extension/issues)

3. **Include**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots of error messages
   - Console logs

### ✅ Success Indicators

When the extension is working properly, you should see:

1. **Status bar item**: "$(bug) MCP: XE YW" (showing error and warning counts)
2. **Available commands** in Command Palette:
   - "MCP Diagnostics: Restart MCP Diagnostics Server"
   - "MCP Diagnostics: Show MCP Diagnostics Status"
3. **Console message**: "MCP Diagnostics Extension activated successfully!"
4. **No error notifications** during startup

### 🎯 Quick Fix Checklist

- [ ] Extension is installed and enabled
- [ ] Window has been reloaded
- [ ] No console errors in Developer Tools
- [ ] Extension appears in "Show Running Extensions"
- [ ] Commands appear in Command Palette
- [ ] Status bar shows MCP diagnostics
- [ ] Port is available (check settings if needed)

If all else fails, try installing the extension in a fresh VS Code installation to isolate Cursor-specific issues.
