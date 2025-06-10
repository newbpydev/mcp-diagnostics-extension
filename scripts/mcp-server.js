#!/usr/bin/env node

/**
 * Standalone Real VS Code Diagnostics MCP Server
 * This script provides REAL diagnostic data from workspace analysis
 * without depending on the VS Code extension runtime
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Real diagnostics cache
let diagnosticsCache = new Map();
let lastRefresh = 0;
let refreshPromise = null;

// Get the extension directory (where this script is located)
const extensionDir = path.dirname(__dirname);

// Function to run TypeScript diagnostics
async function runTypeScriptDiagnostics() {
  return new Promise((resolve) => {
    const results = [];
    const tsconfigPath = path.join(extensionDir, 'tsconfig.json');

    if (!fs.existsSync(tsconfigPath)) {
      console.error(`[Real Diagnostics] No tsconfig.json found at ${tsconfigPath}, skipping TypeScript diagnostics`);
      resolve([]);
      return;
    }

    console.error('[Real Diagnostics] Running TypeScript diagnostics...');

    const tsc = spawn('npx', ['tsc', '--noEmit', '--pretty', 'false', '--skipLibCheck'], {
      cwd: extensionDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
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
      fs.existsSync(path.join(extensionDir, config))
    );

    if (!hasEslintConfig) {
      console.error(`[Real Diagnostics] No ESLint config found in ${extensionDir}, skipping ESLint diagnostics`);
      resolve([]);
      return;
    }

    console.error('[Real Diagnostics] Running ESLint diagnostics...');

    const eslint = spawn('npx', ['eslint', '.', '--format', 'json', '--ignore-pattern', 'out/**', '--ignore-pattern', 'dist/**', '--ignore-pattern', 'coverage/**', '--ignore-pattern', 'node_modules/**', '--ignore-pattern', '*.js.map'], {
      cwd: extensionDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
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
      const absolutePath = path.resolve(extensionDir, filePath);

      problems.push({
        filePath: absolutePath,
        workspaceFolder: path.basename(extensionDir),
        range: {
          start: { line: parseInt(lineNum) - 1, character: parseInt(col) - 1 },
          end: { line: parseInt(lineNum) - 1, character: parseInt(col) - 1 + 10 }
        },
        severity: severity === 'error' ? 'Error' : severity === 'warning' ? 'Warning' : 'Information',
        message,
        source: 'typescript',
        code: `TS${code}`
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
          filePath: file.filePath,
          workspaceFolder: path.basename(extensionDir),
          range: {
            start: { line: (message.line || 1) - 1, character: (message.column || 1) - 1 },
            end: { line: (message.endLine || message.line || 1) - 1, character: (message.endColumn || message.column || 1) - 1 }
          },
          severity: message.severity === 2 ? 'Error' : 'Warning',
          message: message.message,
          source: 'eslint',
          code: message.ruleId || 'unknown'
        });
      }
    }
  } catch (error) {
    console.error('[Real Diagnostics] Error parsing ESLint JSON:', error);
  }

  return problems;
}

// Try to load diagnostics from VS Code extension export
async function loadVSCodeExportedDiagnostics() {
  try {
    const exportPath = path.join(require('os').tmpdir(), 'vscode-diagnostics-export.json');

    if (fs.existsSync(exportPath)) {
      const stat = fs.statSync(exportPath);
      const age = Date.now() - stat.mtime.getTime();

      // Use exported data if it's less than 5 minutes old
      if (age < 5 * 60 * 1000) {
        const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
        console.error(`[Real Diagnostics] Loaded ${data.problemCount} VS Code problems from export (${Math.round(age/1000)}s old)`);
        return data.problems || [];
      } else {
        console.error(`[Real Diagnostics] VS Code export is too old (${Math.round(age/1000)}s), using fallback analysis`);
      }
    } else {
      console.error('[Real Diagnostics] No VS Code export found, using fallback analysis');
    }
  } catch (error) {
    console.error('[Real Diagnostics] Error loading VS Code export:', error);
  }

  return null;
}

// Refresh diagnostics cache
async function refreshDiagnostics() {
  // If a refresh is already in progress, return the existing promise
  if (refreshPromise) {
    return refreshPromise;
  }

  // Check if we have recent diagnostics (less than 30 seconds old)
  if (lastRefresh && Date.now() - lastRefresh < 30000) {
    return;
  }

  refreshPromise = (async () => {
    console.error('[Real Diagnostics] Refreshing diagnostics...');

    try {
      // First, try to load from VS Code extension export
      const vscodeProblems = await loadVSCodeExportedDiagnostics();

      if (vscodeProblems && vscodeProblems.length > 0) {
        // Use VS Code export data
        diagnosticsCache.clear();

        for (const problem of vscodeProblems) {
          const filePath = problem.filePath;
          if (!diagnosticsCache.has(filePath)) {
            diagnosticsCache.set(filePath, []);
          }
          diagnosticsCache.get(filePath).push(problem);
        }

        lastRefresh = Date.now();
        console.error(`[Real Diagnostics] Using ${vscodeProblems.length} problems from VS Code export in ${diagnosticsCache.size} files`);
        return;
      }

      // Fallback to standalone analysis
      console.error('[Real Diagnostics] Using fallback standalone analysis...');

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
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Get all problems with optional filtering
function getAllProblems(filter = {}) {
  const allProblems = [];

  for (const [filePath, problems] of diagnosticsCache.entries()) {
    for (const problem of problems) {
      // Apply filters
      if (filter.severity && problem.severity !== filter.severity) continue;
      if (filter.workspaceFolder && problem.workspaceFolder !== filter.workspaceFolder) continue;
      if (filter.filePath && problem.filePath !== filter.filePath) continue;

      allProblems.push(problem);
    }
  }

  return allProblems;
}

// Get workspace summary
function getWorkspaceSummary() {
  const summary = {
    totalProblems: 0,
    problemsBySeverity: {
      Error: 0,
      Warning: 0,
      Information: 0,
      Hint: 0
    },
    problemsBySource: {},
    affectedFiles: diagnosticsCache.size,
    workspaceFolder: path.basename(process.cwd()),
    lastUpdated: new Date(lastRefresh).toISOString()
  };

  for (const problems of diagnosticsCache.values()) {
    for (const problem of problems) {
      summary.totalProblems++;
      summary.problemsBySeverity[problem.severity]++;

      if (!summary.problemsBySource[problem.source]) {
        summary.problemsBySource[problem.source] = 0;
      }
      summary.problemsBySource[problem.source]++;
    }
  }

  return summary;
}

// Create and configure the MCP server
const server = new Server(
  {
    name: 'vscode-diagnostics-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'getProblems',
        description: 'Get all current problems/diagnostics from workspace analysis',
        inputSchema: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              enum: ['Error', 'Warning', 'Information', 'Hint'],
              description: 'Filter by severity level'
            },
            workspaceFolder: {
              type: 'string',
              description: 'Filter by workspace folder name'
            },
            filePath: {
              type: 'string',
              description: 'Filter by specific file path'
            }
          }
        }
      },
      {
        name: 'getProblemsForFile',
        description: 'Get problems for a specific file',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Absolute file path'
            }
          },
          required: ['filePath']
        }
      },
      {
        name: 'getWorkspaceSummary',
        description: 'Get summary statistics of problems across workspace',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Refresh diagnostics before serving any tool
    await refreshDiagnostics();

    switch (name) {
      case 'getProblems': {
        const problems = getAllProblems(args || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                problems,
                count: problems.length,
                timestamp: new Date().toISOString(),
                note: 'Real diagnostic data from workspace analysis'
              }, null, 2)
            }
          ]
        };
      }

      case 'getProblemsForFile': {
        const { filePath } = args || {};
        if (!filePath) {
          throw new Error('filePath is required');
        }

        // Normalize the file path for comparison
        const normalizedRequestPath = path.resolve(filePath);

        // Try direct lookup first
        let problems = diagnosticsCache.get(filePath) || [];

        // If no direct match, try normalized path
        if (problems.length === 0) {
          problems = diagnosticsCache.get(normalizedRequestPath) || [];
        }

        // If still no match, search through all keys for partial matches
        if (problems.length === 0) {
          for (const [cachedPath, cachedProblems] of diagnosticsCache.entries()) {
            const normalizedCachedPath = path.resolve(cachedPath);
            if (normalizedCachedPath === normalizedRequestPath) {
              problems = cachedProblems;
              break;
            }
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                filePath,
                problems,
                count: problems.length,
                timestamp: new Date().toISOString(),
                debug: {
                  requestedPath: filePath,
                  normalizedPath: normalizedRequestPath,
                  cacheKeys: Array.from(diagnosticsCache.keys()).slice(0, 5) // Show first 5 for debugging
                }
              }, null, 2)
            }
          ]
        };
      }

      case 'getWorkspaceSummary': {
        const summary = getWorkspaceSummary();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error handling tool ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Initialize and start the server
async function main() {
  console.error('[Real MCP Server] Starting REAL MCP Diagnostics server...');
  console.error(`[Real MCP Server] Extension Directory: ${extensionDir}`);
  console.error(`[Real MCP Server] Initial CWD: ${process.cwd()}`);
  console.error(`[Real MCP Server] Script Location: ${__filename}`);
  console.error(`[Real MCP Server] Script Dir: ${__dirname}`);

  // Verify extension directory exists
  if (!fs.existsSync(extensionDir)) {
    console.error(`[Real MCP Server] ERROR: Extension directory does not exist: ${extensionDir}`);
    process.exit(1);
  }

  // Verify critical files exist
  const tsConfigPath = path.join(extensionDir, 'tsconfig.json');
  const eslintConfigPath = path.join(extensionDir, 'eslint.config.mjs');
  console.error(`[Real MCP Server] Checking tsconfig.json: ${fs.existsSync(tsConfigPath) ? 'EXISTS' : 'MISSING'} at ${tsConfigPath}`);
  console.error(`[Real MCP Server] Checking eslint.config.mjs: ${fs.existsSync(eslintConfigPath) ? 'EXISTS' : 'MISSING'} at ${eslintConfigPath}`);

  // Change to extension directory for consistent operations
  try {
    process.chdir(extensionDir);
    console.error(`[Real MCP Server] Changed to extension directory: ${process.cwd()}`);
    } catch (error) {
    console.error(`[Real MCP Server] Failed to change directory: ${error.message}`);
      process.exit(1);
    }

  // Initial diagnostics refresh
  await refreshDiagnostics();

  // Create transport and connect
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[Real MCP Server] ✅ REAL MCP Diagnostics server started successfully!');
  console.error('[Real MCP Server] 📊 Providing REAL diagnostic data from workspace analysis');
  console.error('[Real MCP Server] Available tools:');
  console.error('[Real MCP Server] - getProblems: Get real current problems/diagnostics');
  console.error('[Real MCP Server] - getProblemsForFile: Get real problems for a specific file');
  console.error('[Real MCP Server] - getWorkspaceSummary: Get real summary statistics of problems');
  console.error('[Real MCP Server] Server is ready to accept MCP connections via stdio');

  // Set up periodic refresh
  setInterval(async () => {
    try {
      await refreshDiagnostics();
    } catch (error) {
      console.error('[Real MCP Server] Error during periodic refresh:', error);
    }
  }, 30000); // Refresh every 30 seconds
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('[Real MCP Server] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[Real MCP Server] Received SIGTERM, shutting down...');
  process.exit(0);
  });

  // Start the server
main().catch((error) => {
  console.error('[Real MCP Server] ❌ Failed to start MCP server:', error);
    process.exit(1);
  });
