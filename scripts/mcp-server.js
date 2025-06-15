#!/usr/bin/env node

// 🚀 MCP Diagnostics Bootstrap – ensure additional node_module paths
// This must be executed BEFORE any `require()` that depends on extension-provided
// dependencies (e.g. @modelcontextprotocol/sdk).  We read a path from the
// MCP_NODE_MODULES_PATH environment variable that the extension sets when it
// generates the MCP configuration and, if present, push it onto Node's global
// module resolution list so that `require()` can locate the dependency even
// though the standalone server is running from the user's home directory.
const Module = require('module');
if (process.env.MCP_NODE_MODULES_PATH) {
  const extra = process.env.MCP_NODE_MODULES_PATH;
  if (!Module.globalPaths.includes(extra)) {
    Module.globalPaths.push(extra);
  }
}

/**
 * Standalone Real VS Code Diagnostics MCP Server - Cross-Platform Enhanced
 * This script provides REAL diagnostic data from workspace analysis
 * with full cross-platform compatibility (Windows, macOS, Linux)
 */

const path = require('path');

// Resolve SDK paths from injected NODE_MODULES dir (set by VS Code extension)
const NODE_MODULES_DIR =
  process.env.MCP_NODE_MODULES_PATH || path.join(__dirname, '..', 'node_modules');

function r(relPath) {
  try {
    return require(path.join(NODE_MODULES_DIR, relPath));
  } catch {
    // Fallback to Node's resolver (will succeed when script runs inside extension dir)
    return require(relPath.startsWith('@') ? relPath : path.join('..', 'node_modules', relPath));
  }
}

const { Server } = r('@modelcontextprotocol/sdk/dist/cjs/server/index.js');
const { StdioServerTransport } = r('@modelcontextprotocol/sdk/dist/cjs/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema
} = r('@modelcontextprotocol/sdk/dist/cjs/types.js');
const fs = require('fs');
const { spawn } = require('child_process');

// Real diagnostics cache
let diagnosticsCache = new Map();
let lastRefresh = 0;
let refreshPromise = null;

// Get the extension directory (where this script is located)
const extensionDir = path.dirname(__dirname);

// ✅ PHASE 4.2: Cross-Platform Utilities Integration
// Import compiled CrossPlatformUtils from the built extension
let CrossPlatformUtils;
try {
  // Try to import from compiled output
  const compiledUtilsPath = path.join(extensionDir, 'out', 'shared', 'utils', 'CrossPlatformUtils.js');
  if (fs.existsSync(compiledUtilsPath)) {
    CrossPlatformUtils = require(compiledUtilsPath).CrossPlatformUtils;
    // Silently loaded - no output to prevent MCP protocol interference
  } else {
    // Silently using fallback - no output to prevent MCP protocol interference
    CrossPlatformUtils = null;
  }
} catch (error) {
  // Silently handling error - no output to prevent MCP protocol interference
  CrossPlatformUtils = null;
}

// ✅ PHASE 4.2: Fallback Cross-Platform Implementation
// If CrossPlatformUtils is not available, provide fallback implementation
const CrossPlatform = CrossPlatformUtils || {
  /**
   * Get platform-specific spawn options with cross-platform compatibility
   */
  getSpawnOptions(cwd) {
    const baseOptions = {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'production',
      }
    };

    // 🚨 CRITICAL: Windows requires shell: true for npm/npx commands
    if (process.platform === 'win32') {
      return {
        ...baseOptions,
        shell: true
      };
    }

    return baseOptions;
  },

  /**
   * Get platform-specific command for npm/npx
   */
  getCommandForPlatform(command) {
    if (process.platform === 'win32') {
      return `${command}.cmd`;
    }
    return command;
  },

  /**
   * Get diagnostic export path (cross-platform temp directory)
   */
  getDiagnosticExportPath() {
    return path.join(require('os').tmpdir(), 'vscode-diagnostics-export.json');
  },

  /**
   * Check if a command exists on the system
   */
  async commandExists(command) {
    return new Promise((resolve) => {
      const checkCommand = process.platform === 'win32' ? 'where' : 'which';
      const proc = spawn(checkCommand, [command], {
        stdio: 'ignore',
        shell: process.platform === 'win32'
      });

      proc.on('close', (code) => {
        resolve(code === 0);
      });

      proc.on('error', () => {
        resolve(false);
      });
    });
  },

  /**
   * Platform detection utilities
   */
  isWindows() { return process.platform === 'win32'; },
  isMac() { return process.platform === 'darwin'; },
  isLinux() { return process.platform !== 'win32' && process.platform !== 'darwin'; }
};

// ✅ CRITICAL FIX: Silent logging in MCP mode to prevent JSON protocol violations
function mcpLog(...args) {
  // Only log when NOT running as MCP server
  // MCP uses stdio for JSON communication, any extra output breaks the protocol
  // Detect MCP mode by checking if we're being run by an MCP client
  const isMcpMode = process.argv.includes('--stdio') ||
                    process.env.MCP_MODE === 'true' ||
                    process.env.NODE_ENV === 'production' ||
                    !process.stdin.isTTY ||
                    process.stdout.isTTY === false;

  // Only output logs in development/debug mode when NOT in MCP mode
  if (!isMcpMode && process.env.NODE_ENV !== 'test' && process.env.MCP_DEBUG === 'true') {
    console.error(...args);
  }
}

// ✅ PHASE 4.2: Platform detection and logging with cross-platform info
mcpLog(`[System Info] Running on ${process.platform} (${process.arch})`);
mcpLog(`[System Info] Node.js ${process.version}`);
mcpLog(`[System Info] Extension directory: ${extensionDir}`);
mcpLog(`[Cross-Platform] Windows: ${CrossPlatform.isWindows()}`);
mcpLog(`[Cross-Platform] macOS: ${CrossPlatform.isMac()}`);
mcpLog(`[Cross-Platform] Linux: ${CrossPlatform.isLinux()}`);
if (CrossPlatformUtils) {
  mcpLog(`[Cross-Platform] Using compiled CrossPlatformUtils`);
} else {
  mcpLog(`[Cross-Platform] Using fallback cross-platform implementation`);
}

// ✅ PHASE 4.2: Enhanced TypeScript diagnostics with cross-platform support
async function runTypeScriptDiagnostics() {
  return new Promise(async (resolve) => {
    const results = [];
    const tsconfigPath = path.join(extensionDir, 'tsconfig.json');

    if (!fs.existsSync(tsconfigPath)) {
      mcpLog(`[Real Diagnostics] No tsconfig.json found at ${tsconfigPath}, skipping TypeScript diagnostics`);
      resolve([]);
      return;
    }

    // ✅ Check if TypeScript is available using cross-platform command detection
    const tscCommand = CrossPlatform.getCommandForPlatform('npx');
    const hasTypeScript = await CrossPlatform.commandExists('tsc');
    if (!hasTypeScript) {
      mcpLog('[Real Diagnostics] TypeScript not found, skipping diagnostics');
      resolve([]);
      return;
    }

    mcpLog('[Real Diagnostics] Running TypeScript diagnostics with cross-platform support...');

    // ✅ Use cross-platform spawn options
    const spawnOptions = CrossPlatform.getSpawnOptions(extensionDir);
    const tscArgs = ['tsc', '--noEmit', '--pretty', 'false', '--skipLibCheck'];

    const tsc = spawn(tscCommand, tscArgs, spawnOptions);

    let output = '';
    tsc.stdout.on('data', (data) => { output += data.toString(); });
    tsc.stderr.on('data', (data) => { output += data.toString(); });

    tsc.on('close', () => {
      if (output.trim()) {
        const problems = parseTypeScriptOutput(output);
        results.push(...problems);
      }
      mcpLog(`[Real Diagnostics] TypeScript analysis complete: ${results.length} problems found`);
      resolve(results);
    });

    tsc.on('error', (error) => {
      mcpLog('[Real Diagnostics] TypeScript error:', error);
      resolve([]);
    });
  });
}

// ✅ PHASE 4.2: Enhanced ESLint diagnostics with cross-platform support
async function runESLintDiagnostics() {
  return new Promise(async (resolve) => {
    const results = [];
    const eslintConfigs = ['.eslintrc.js', '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs'];
    const hasEslintConfig = eslintConfigs.some(config =>
      fs.existsSync(path.join(extensionDir, config))
    );

    if (!hasEslintConfig) {
      mcpLog(`[Real Diagnostics] No ESLint config found in ${extensionDir}, skipping ESLint diagnostics`);
      resolve([]);
      return;
    }

    // ✅ Check if ESLint is available using cross-platform command detection
    const eslintCommand = CrossPlatform.getCommandForPlatform('npx');
    const hasESLint = await CrossPlatform.commandExists('eslint');
    if (!hasESLint) {
      mcpLog('[Real Diagnostics] ESLint not found, skipping diagnostics');
      resolve([]);
      return;
    }

    mcpLog('[Real Diagnostics] Running ESLint diagnostics with cross-platform support...');

    // ✅ Use cross-platform spawn options
    const spawnOptions = CrossPlatform.getSpawnOptions(extensionDir);
    const eslintArgs = [
      'eslint',
      '.',
      '--format', 'json',
      '--ignore-pattern', 'out/**',
      '--ignore-pattern', 'dist/**',
      '--ignore-pattern', 'coverage/**',
      '--ignore-pattern', 'node_modules/**',
      '--ignore-pattern', '*.js.map'
    ];

    const eslint = spawn(eslintCommand, eslintArgs, spawnOptions);

    let output = '';
    eslint.stdout.on('data', (data) => { output += data.toString(); });

    eslint.on('close', () => {
      if (output.trim()) {
        try {
          const problems = parseESLintOutput(output);
          results.push(...problems);
        } catch (error) {
          mcpLog('[Real Diagnostics] Error parsing ESLint output:', error);
        }
      }
      mcpLog(`[Real Diagnostics] ESLint analysis complete: ${results.length} problems found`);
      resolve(results);
    });

    eslint.on('error', (error) => {
      mcpLog('[Real Diagnostics] ESLint error:', error);
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
    // Avoid noisy console output during automated test runs and MCP mode
    mcpLog('[Real Diagnostics] Error parsing ESLint JSON:', error);
  }

  return problems;
}

// ✅ PHASE 4.2: Enhanced VS Code export loading with cross-platform paths
async function loadVSCodeExportedDiagnostics() {
  try {
    const exportPath = CrossPlatform.getDiagnosticExportPath();

    if (fs.existsSync(exportPath)) {
      const stat = fs.statSync(exportPath);
      const age = Date.now() - stat.mtime.getTime();

      // Use exported data if it's less than 5 minutes old
      if (age < 5 * 60 * 1000) {
        const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
        mcpLog(`[Real Diagnostics] Loaded ${data.problemCount || 0} VS Code problems from export (${Math.round(age/1000)}s old)`);
        return data.problems || [];
      } else {
        mcpLog(`[Real Diagnostics] VS Code export is too old (${Math.round(age/1000)}s), using fallback analysis`);
      }
    } else {
      mcpLog('[Real Diagnostics] No VS Code export found, using fallback analysis');
    }
  } catch (error) {
    mcpLog('[Real Diagnostics] Error loading VS Code export:', error);
  }

  return null;
}

// Refresh diagnostics cache
async function refreshDiagnostics() {
  // If a refresh is already in progress, return the existing promise
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      mcpLog('[Real Diagnostics] Refreshing diagnostic cache...');
      const startTime = Date.now();

      // Clear existing cache
      diagnosticsCache.clear();

      // Try to load from VS Code export first
      let vsCodeProblems = await loadVSCodeExportedDiagnostics();

      if (vsCodeProblems && vsCodeProblems.length > 0) {
        // Use VS Code export data
        for (const problem of vsCodeProblems) {
          const key = `${problem.filePath}:${problem.range.start.line}:${problem.range.start.character}`;
          diagnosticsCache.set(key, problem);
        }
        mcpLog(`[Real Diagnostics] Using ${vsCodeProblems.length} problems from VS Code export`);
      } else {
        // Fall back to static analysis
        mcpLog('[Real Diagnostics] Running static analysis fallback...');

        const [typeScriptProblems, eslintProblems] = await Promise.all([
          runTypeScriptDiagnostics(),
          runESLintDiagnostics()
        ]);

        const allProblems = [...typeScriptProblems, ...eslintProblems];

        for (const problem of allProblems) {
          const key = `${problem.filePath}:${problem.range.start.line}:${problem.range.start.character}`;
          diagnosticsCache.set(key, problem);
        }

        mcpLog(`[Real Diagnostics] Static analysis complete: ${typeScriptProblems.length} TypeScript + ${eslintProblems.length} ESLint = ${allProblems.length} total problems`);
      }

      lastRefresh = Date.now();
      const duration = lastRefresh - startTime;
      mcpLog(`[Real Diagnostics] Cache refresh completed in ${duration}ms`);

    } catch (error) {
      mcpLog('[Real Diagnostics] Error refreshing diagnostics:', error);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Function to get all cached problems with optional filtering
function getAllProblems(filter = {}) {
  const problems = Array.from(diagnosticsCache.values());

  let filteredProblems = problems;

  if (filter.severity) {
    filteredProblems = filteredProblems.filter(p => p.severity === filter.severity);
  }

  if (filter.filePath) {
    filteredProblems = filteredProblems.filter(p => p.filePath === filter.filePath);
  }

  if (filter.workspaceFolder) {
    filteredProblems = filteredProblems.filter(p => p.workspaceFolder === filter.workspaceFolder);
  }

  return filteredProblems;
}

// Function to get workspace summary
function getWorkspaceSummary() {
  const problems = Array.from(diagnosticsCache.values());

  const summary = {
    totalProblems: problems.length,
    errorCount: problems.filter(p => p.severity === 'Error').length,
    warningCount: problems.filter(p => p.severity === 'Warning').length,
    infoCount: problems.filter(p => p.severity === 'Information').length,
    fileCount: new Set(problems.map(p => p.filePath)).size,
    sourceBreakdown: {},
    workspaceFolders: Array.from(new Set(problems.map(p => p.workspaceFolder)))
  };

  // Source breakdown
  for (const problem of problems) {
    const source = problem.source || 'unknown';
    summary.sourceBreakdown[source] = (summary.sourceBreakdown[source] || 0) + 1;
  }

  return summary;
}

// -------------------------------------------------------------
// 🧪 Test-mode guard & coverage optimisation
// When the script is "require"d (e.g. from Jest) we don't want to start
// the long-running MCP server or execute heavyweight diagnostics. We also
// exclude that branch from Istanbul coverage because those lines are
// exercised via dedicated integration tests in a separate suite.
// -------------------------------------------------------------

const isTestEnv = process.env.NODE_ENV === 'test';

/* istanbul ignore next – CLI-only server bootstrap */
if (!isTestEnv && require.main === module) {
  // Create the MCP server only when executed directly as CLI
  const server = new Server(
    {
      name: 'vscode-diagnostics-server',
      version: '1.2.11',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /* istanbul ignore next – runtime server tooling registration */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'getProblems',
          description: 'Get all current problems/diagnostics from VS Code workspace analysis',
          inputSchema: {
            type: 'object',
            properties: {
              severity: { type: 'string', enum: ['Error', 'Warning', 'Information', 'Hint'] },
              workspaceFolder: { type: 'string' },
              filePath: { type: 'string' }
            }
          }
        },
        {
          name: 'getProblemsForFile',
          description: 'Get problems for a specific file',
          inputSchema: {
            type: 'object',
            properties: { filePath: { type: 'string' } },
            required: ['filePath']
          }
        },
        {
          name: 'getWorkspaceSummary',
          description: 'Get summary statistics of problems across workspace',
          inputSchema: { type: 'object', properties: {} }
        }
      ]
    };
  });

  /* istanbul ignore next – runtime server tooling registration */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const cacheAge = Date.now() - lastRefresh;
    if (cacheAge > 30000) {
      await refreshDiagnostics();
    }

    try {
      switch (name) {
        case 'getProblems': {
          const problems = getAllProblems(args || {});
          return {
            content: [{ type: 'text', text: JSON.stringify({ count: problems.length, problems }, null, 2) }]
          };
        }
        case 'getProblemsForFile': {
          if (!args?.filePath) throw new Error('filePath parameter is required');
          const problems = getAllProblems({ filePath: args.filePath });
          return {
            content: [{ type: 'text', text: JSON.stringify({ count: problems.length, filePath: args.filePath, problems }, null, 2) }]
          };
        }
        case 'getWorkspaceSummary': {
          const summary = getWorkspaceSummary();
          return {
            content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
          };
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  });

  /* istanbul ignore next – CLI main */
  async function main() {
    try {
      mcpLog('[MCP Server] Starting cross-platform VS Code Diagnostics MCP server...');

      // 1. Establish the STDIO transport **first** so that the MCP client
      //    immediately receives the required "server/info" payload.  Delaying
      //    this until after heavyweight static analysis can cause the client
      //    to time-out with the cryptic "No server info found" error that the
      //    user observed in the logs.
      const transport = new StdioServerTransport();
      await server.connect(transport);
      mcpLog('[MCP Server] ✅ Server connected – initial server/info sent');

      // 2. Kick-off the diagnostics refresh *after* the connection has been
      //    established.  We run this in the background (fire-and-forget) so
      //    that the MCP handshake completes instantly.  The CallTool handler
      //    already guards against stale caches, so subsequent requests will
      //    either use these freshly collected diagnostics or trigger a
      //    refresh if the cache is still warming up.
      void refreshDiagnostics();
      mcpLog('[MCP Server] 🔄 Background diagnostics refresh started');
    } catch (error) {
      mcpLog('[MCP Server] ❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  // Graceful shutdown handlers
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));

  // Execute only when invoked via CLI (not in tests)
  main();
}

// -------------------------------------------------------------
// 🔍 Test-exposed helpers
// When imported (require.main !== module) we expose pure helpers so that
// unit tests can achieve high coverage without relying on fragile
// implementation details or spawning child processes.
// -------------------------------------------------------------

if (require.main !== module) {
  module.exports = {
    parseTypeScriptOutput,
    parseESLintOutput,
    CrossPlatform
  };
}
