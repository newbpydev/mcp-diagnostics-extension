#!/usr/bin/env node

/**
 * Real VS Code Diagnostics MCP Server
 * This script runs the MCP server independently of VS Code
 * and provides REAL diagnostic data from workspace analysis
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Add the project root to the module path
const projectRoot = path.resolve(__dirname, '..');
require('module').globalPaths.push(path.join(projectRoot, 'out'));

// Real diagnostics cache
let diagnosticsCache = new Map();
let lastRefresh = 0;

// Function to run TypeScript diagnostics
async function runTypeScriptDiagnostics() {
  return new Promise((resolve) => {
    const results = [];
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');

    if (!fs.existsSync(tsconfigPath)) {
      console.error('[Real Diagnostics] No tsconfig.json found, skipping TypeScript diagnostics');
      resolve([]);
      return;
    }

    console.error('[Real Diagnostics] Running TypeScript diagnostics...');

    const tsc = spawn('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    tsc.stdout.on('data', (data) => { output += data.toString(); });
    tsc.stderr.on('data', (data) => { output += data.toString(); });

    tsc.on('close', () => {
      if (output.trim()) {
        const problems = parseTypeScriptOutput(output);
        results.push(...problems);
      }
      resolve(results);
    });

    tsc.on('error', (error) => {
      console.error('[Real Diagnostics] TypeScript error:', error);
      resolve([]);
    });
  });
}

// Function to run ESLint diagnostics
async function runESLintDiagnostics() {
  return new Promise((resolve) => {
    const results = [];
    const eslintConfigs = ['.eslintrc.js', '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs'];
    const hasEslintConfig = eslintConfigs.some(config =>
      fs.existsSync(path.join(process.cwd(), config))
    );

    if (!hasEslintConfig) {
      console.error('[Real Diagnostics] No ESLint config found, skipping ESLint diagnostics');
      resolve([]);
      return;
    }

    console.error('[Real Diagnostics] Running ESLint diagnostics...');

    const eslint = spawn('npx', ['eslint', '.', '--format', 'json'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    eslint.stdout.on('data', (data) => { output += data.toString(); });

    eslint.on('close', () => {
      if (output.trim()) {
        try {
          const problems = parseESLintOutput(output);
          results.push(...problems);
        } catch (error) {
          console.error('[Real Diagnostics] Error parsing ESLint output:', error);
        }
      }
      resolve(results);
    });

    eslint.on('error', (error) => {
      console.error('[Real Diagnostics] ESLint error:', error);
      resolve([]);
    });
  });
}

// Parse TypeScript output
function parseTypeScriptOutput(output) {
  const problems = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning|info)\s+TS(\d+):\s+(.+)$/);
    if (match) {
      const [, filePath, lineNum, col, severity, code, message] = match;

      problems.push({
        range: {
          start: { line: parseInt(lineNum) - 1, character: parseInt(col) - 1 },
          end: { line: parseInt(lineNum) - 1, character: parseInt(col) - 1 + 10 }
        },
        severity: severity === 'error' ? 2 : severity === 'warning' ? 1 : 0, // VS Code DiagnosticSeverity
        message,
        source: 'typescript',
        code: `TS${code}`,
        filePath: path.resolve(process.cwd(), filePath)
      });
    }
  }

  return problems;
}

// Parse ESLint output
function parseESLintOutput(output) {
  const problems = [];

  try {
    const eslintResults = JSON.parse(output);

    for (const file of eslintResults) {
      for (const message of file.messages) {
        problems.push({
          range: {
            start: { line: (message.line || 1) - 1, character: (message.column || 1) - 1 },
            end: { line: (message.endLine || message.line || 1) - 1, character: (message.endColumn || message.column || 1) - 1 }
          },
          severity: message.severity === 2 ? 2 : 1, // VS Code DiagnosticSeverity
          message: message.message,
          source: 'eslint',
          code: message.ruleId || 'unknown',
          filePath: file.filePath
        });
      }
    }
  } catch (error) {
    console.error('[Real Diagnostics] Error parsing ESLint JSON:', error);
  }

  return problems;
}

// Refresh diagnostics cache
async function refreshDiagnostics() {
  // Check if we have recent diagnostics (less than 30 seconds old)
  if (lastRefresh && Date.now() - lastRefresh < 30000) {
    return;
  }

  console.error('[Real Diagnostics] Refreshing diagnostics...');

  try {
    // Run TypeScript diagnostics
    const tsResults = await runTypeScriptDiagnostics();

    // Run ESLint diagnostics
    const eslintResults = await runESLintDiagnostics();

    // Combine and update cache
    const allResults = [...tsResults, ...eslintResults];

    // Clear existing cache
    diagnosticsCache.clear();

    // Group problems by file
    for (const problem of allResults) {
      const filePath = problem.filePath;
      if (!diagnosticsCache.has(filePath)) {
        diagnosticsCache.set(filePath, []);
      }
      diagnosticsCache.get(filePath).push(problem);
    }

    lastRefresh = Date.now();
    console.error(`[Real Diagnostics] Found ${allResults.length} diagnostic issues in ${diagnosticsCache.size} files`);
  } catch (error) {
    console.error('[Real Diagnostics] Error refreshing diagnostics:', error);
  }
}

try {
  // Import our compiled modules
  const { McpServerWrapper } = require('../out/infrastructure/mcp/McpServerWrapper.js');
  const { DiagnosticsWatcher } = require('../out/core/diagnostics/DiagnosticsWatcher.js');
  const { VsCodeApiAdapter } = require('../out/infrastructure/vscode/VsCodeApiAdapter.js');

  // Create a REAL VS Code API that provides actual diagnostic data
  const realVscode = {
    languages: {
      onDidChangeDiagnostics: (callback) => {
        // Simulate diagnostic changes by periodically refreshing
        const interval = setInterval(async () => {
          await refreshDiagnostics();
          // Trigger callback with all files that have diagnostics
          const uris = Array.from(diagnosticsCache.keys()).map(filePath => ({
            toString: () => filePath,
            fsPath: filePath
          }));
          if (uris.length > 0) {
            callback({ uris });
          }
        }, 10000); // Refresh every 10 seconds

        return {
          dispose: () => {
            clearInterval(interval);
          }
        };
      },
      getDiagnostics: (uri) => {
        if (uri) {
          // Return diagnostics for specific file
          const filePath = uri.toString();
          return diagnosticsCache.get(filePath) || [];
        } else {
          // Return all diagnostics as [uri, diagnostics[]] tuples
          const result = [];
          for (const [filePath, diagnostics] of diagnosticsCache.entries()) {
            result.push([
              { toString: () => filePath, fsPath: filePath },
              diagnostics
            ]);
          }
          return result;
        }
      }
    },
    workspace: {
      getWorkspaceFolder: (uri) => {
        // Return a real workspace folder
        return {
          name: path.basename(process.cwd()),
          uri: { fsPath: process.cwd() }
        };
      }
    }
  };

  console.log('[Real MCP Server] Starting REAL MCP Diagnostics server...');
  console.log(`[Real MCP Server] Workspace: ${process.cwd()}`);

  // Initial diagnostics refresh
  refreshDiagnostics().then(() => {
  // Create the adapter and watcher
    const adapter = new VsCodeApiAdapter(realVscode);
  const watcher = new DiagnosticsWatcher(adapter);

  // Create and start the MCP server
  const server = new McpServerWrapper(watcher, {
    enableDebugLogging: true,
    port: 6070
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
      console.log('[Real MCP Server] Shutting down gracefully...');
    try {
      await server.stop();
      watcher.dispose();
      process.exit(0);
    } catch (error) {
        console.error('[Real MCP Server] Error during shutdown:', error);
      process.exit(1);
    }
  });

  process.on('SIGTERM', async () => {
      console.log('[Real MCP Server] Received SIGTERM, shutting down...');
    try {
      await server.stop();
      watcher.dispose();
      process.exit(0);
    } catch (error) {
        console.error('[Real MCP Server] Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Start the server
  server.start().then(() => {
      console.log('[Real MCP Server] ✅ REAL MCP Diagnostics server started successfully!');
      console.log('[Real MCP Server] 📊 Providing REAL diagnostic data from workspace analysis');
      console.log('[Real MCP Server] Available tools:');
      console.log('[Real MCP Server] - getProblems: Get real current problems/diagnostics');
      console.log('[Real MCP Server] - getProblemsForFile: Get real problems for a specific file');
      console.log('[Real MCP Server] - getWorkspaceSummary: Get real summary statistics of problems');
      console.log('[Real MCP Server] Server is ready to accept MCP connections via stdio');
  }).catch((error) => {
      console.error('[Real MCP Server] ❌ Failed to start MCP server:', error);
    process.exit(1);
    });
  });

} catch (error) {
  console.error('[Real MCP Server] ❌ Failed to initialize MCP server:', error);
  console.error('[Real MCP Server] Make sure the project is compiled with: npm run compile');
  process.exit(1);
}
