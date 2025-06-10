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
      const absolutePath = path.resolve(process.cwd(), filePath);

      problems.push({
        filePath: absolutePath,
        workspaceFolder: path.basename(process.cwd()),
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
          workspaceFolder: path.basename(process.cwd()),
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

        const problems = diagnosticsCache.get(filePath) || [];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                filePath,
                problems,
                count: problems.length,
                timestamp: new Date().toISOString()
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
  console.error(`[Real MCP Server] Workspace: ${process.cwd()}`);

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
