#!/usr/bin/env node

/**
 * Standalone MCP Server for VS Code Diagnostics
 * This script runs the MCP server independently of VS Code
 * for use with Cursor and other MCP clients
 */

const path = require('path');

// Add the project root to the module path
const projectRoot = path.resolve(__dirname, '..');
require('module').globalPaths.push(path.join(projectRoot, 'out'));

try {
  // Import our compiled modules
  const { McpServerWrapper } = require('../out/infrastructure/mcp/McpServerWrapper.js');
  const { DiagnosticsWatcher } = require('../out/core/diagnostics/DiagnosticsWatcher.js');
  const { VsCodeApiAdapter } = require('../out/infrastructure/vscode/VsCodeApiAdapter.js');

  // Create a mock VS Code API for standalone operation
  const mockVscode = {
    languages: {
      onDidChangeDiagnostics: (callback) => {
        // Return a disposable that does nothing
        return { dispose: () => {} };
      },
      getDiagnostics: (uri) => {
        // Return empty diagnostics for now
        // In a real implementation, this could read from a file or other source
        return [];
      }
    },
    workspace: {
      getWorkspaceFolder: (uri) => {
        // Return a mock workspace folder
        return {
          name: 'current-workspace',
          uri: { fsPath: process.cwd() }
        };
      }
    }
  };

  console.log('[MCP Server] Starting standalone MCP Diagnostics server...');

  // Create the adapter and watcher
  const adapter = new VsCodeApiAdapter(mockVscode);
  const watcher = new DiagnosticsWatcher(adapter);

  // Create and start the MCP server
  const server = new McpServerWrapper(watcher, {
    enableDebugLogging: true,
    port: 6070
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('[MCP Server] Shutting down gracefully...');
    try {
      await server.stop();
      watcher.dispose();
      process.exit(0);
    } catch (error) {
      console.error('[MCP Server] Error during shutdown:', error);
      process.exit(1);
    }
  });

  process.on('SIGTERM', async () => {
    console.log('[MCP Server] Received SIGTERM, shutting down...');
    try {
      await server.stop();
      watcher.dispose();
      process.exit(0);
    } catch (error) {
      console.error('[MCP Server] Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Start the server
  server.start().then(() => {
    console.log('[MCP Server] ✅ MCP Diagnostics server started successfully!');
    console.log('[MCP Server] Available tools:');
    console.log('[MCP Server] - getProblems: Get all current problems/diagnostics');
    console.log('[MCP Server] - getProblemsForFile: Get problems for a specific file');
    console.log('[MCP Server] - getWorkspaceSummary: Get summary statistics of problems');
    console.log('[MCP Server] Server is ready to accept MCP connections via stdio');
  }).catch((error) => {
    console.error('[MCP Server] ❌ Failed to start MCP server:', error);
    process.exit(1);
  });

} catch (error) {
  console.error('[MCP Server] ❌ Failed to initialize MCP server:', error);
  console.error('[MCP Server] Make sure the project is compiled with: npm run compile');
  process.exit(1);
}
