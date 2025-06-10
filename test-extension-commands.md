# MCP Diagnostics Extension Testing Guide

## 🧪 Manual Testing Steps

### Prerequisites
1. ✅ Extension is installed: `newbpydev.mcp-diagnostics-extension`
2. ✅ VS Code is open with the test workspace
3. ✅ TypeScript files with errors are present

### Step 1: Verify Extension Activation
1. Open VS Code with the test workspace
2. Check the Extension Host Output:
   - View → Output
   - Select "Extension Host" from dropdown
   - Look for MCP Diagnostics extension logs

### Step 2: Check Problems Panel
1. Open Problems panel: View → Problems
2. Verify TypeScript errors are shown from `example.ts`:
   - Type 'string' is not assignable to type 'number'
   - Property 'email' does not exist on type 'User'
   - Cannot find name 'undefinedVariable'

### Step 3: Test Extension Commands
1. Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Test each command:

#### Command: "MCP Diagnostics: Show Status"
- **Expected**: Opens webview with diagnostic summary
- **Should show**:
  - Total problems count
  - Breakdown by severity (Error, Warning, Info, Hint)
  - Files with problems
  - Workspace information

#### Command: "MCP Diagnostics: Restart Server"
- **Expected**: Shows progress notification
- **Should show**: "Restarting MCP server..." → "MCP server restarted successfully"

### Step 4: Check Status Bar
1. Look at the bottom status bar
2. **Expected**: Shows error/warning counts like: `🔴 3 ⚠️ 1`
3. Click on the status bar item
4. **Expected**: Opens the MCP Diagnostics status webview

### Step 5: Test MCP Server Integration
1. Check Extension Host Output for MCP server logs:
   ```
   [MCP Diagnostics] Server starting on stdio...
   [MCP Diagnostics] Server initialized successfully
   [MCP Diagnostics] Tools registered: getProblems, getProblemsForFile, getWorkspaceSummary
   ```

### Step 6: Verify Real-time Updates
1. Open `test-workspace/example.ts`
2. Fix one of the errors (e.g., change `age: '25'` to `age: 25`)
3. Save the file
4. **Expected**:
   - Problems panel updates immediately
   - Status bar count decreases
   - MCP server receives diagnostic change event

### Step 7: Test with Different File Types
1. Create a new JavaScript file with errors
2. Create a new Python file (if Python extension installed)
3. **Expected**: Extension captures diagnostics from all language servers

## 🔧 Expected MCP Tools

The extension should provide these MCP tools:

### 1. `getProblems`
- **Description**: Get all current problems/diagnostics from VS Code
- **Parameters**:
  - `severity` (optional): Filter by Error, Warning, Information, Hint
  - `workspaceFolder` (optional): Filter by workspace folder
  - `filePath` (optional): Filter by specific file

### 2. `getProblemsForFile`
- **Description**: Get problems for a specific file
- **Parameters**:
  - `filePath` (required): Absolute file path

### 3. `getWorkspaceSummary`
- **Description**: Get summary statistics of problems across workspace
- **Parameters**:
  - `groupBy` (optional): Group by severity, source, or workspaceFolder

## 🎯 Success Criteria

✅ **Extension Activation**
- Extension loads without errors
- MCP server starts successfully
- Commands are registered

✅ **Diagnostic Monitoring**
- Problems panel shows current diagnostics
- Real-time updates when files change
- Status bar shows accurate counts

✅ **MCP Integration**
- Server responds to tool calls
- Tools return properly formatted data
- Resources are available

✅ **User Interface**
- Commands work from Command Palette
- Status webview displays correctly
- Status bar integration functions

✅ **Performance**
- Extension activation < 2 seconds
- Diagnostic processing < 500ms
- MCP tool response < 100ms

## 🐛 Troubleshooting

### Extension Not Loading
1. Check Extension Host Output for errors
2. Verify extension is enabled in Extensions panel
3. Try reloading window: `Ctrl+Shift+P` → "Developer: Reload Window"

### No Diagnostics Showing
1. Ensure TypeScript extension is installed and active
2. Check if files have actual syntax errors
3. Try opening/closing files to trigger analysis

### MCP Server Not Responding
1. Check Extension Host Output for MCP server logs
2. Try "MCP Diagnostics: Restart Server" command
3. Verify no port conflicts (default: stdio transport)

### Status Bar Not Updating
1. Check if diagnostic change events are firing
2. Verify event listeners are properly attached
3. Check for JavaScript errors in Extension Host Output

## 📊 Test Results Template

```
Date: ___________
VS Code Version: ___________
Extension Version: 1.2.4

✅ Extension Activation: PASS/FAIL
✅ Problems Panel: PASS/FAIL
✅ Show Status Command: PASS/FAIL
✅ Restart Server Command: PASS/FAIL
✅ Status Bar Integration: PASS/FAIL
✅ Real-time Updates: PASS/FAIL
✅ MCP Server Logs: PASS/FAIL

Notes:
_________________________________
_________________________________
```
