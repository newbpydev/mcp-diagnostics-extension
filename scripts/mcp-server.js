#!/usr/bin/env node

/**
 * Standalone Real VS Code Diagnostics MCP Server - Cross-Platform Enhanced
 * This script provides REAL diagnostic data from workspace analysis
 * with full cross-platform compatibility (Windows, macOS, Linux)
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

// ✅ PHASE 4.2: Cross-Platform Utilities Integration
// Import compiled CrossPlatformUtils from the built extension
let CrossPlatformUtils;
try {
  // Try to import from compiled output
  const compiledUtilsPath = path.join(extensionDir, 'out', 'shared', 'utils', 'CrossPlatformUtils.js');
  if (fs.existsSync(compiledUtilsPath)) {
    CrossPlatformUtils = require(compiledUtilsPath).CrossPlatformUtils;
    console.error('[Cross-Platform] Using compiled CrossPlatformUtils');
  } else {
    console.error('[Cross-Platform] Compiled utils not found, using fallback implementation');
    CrossPlatformUtils = null;
  }
} catch (error) {
  console.error('[Cross-Platform] Error importing CrossPlatformUtils:', error);
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

// ✅ PHASE 4.2: Enhanced TypeScript diagnostics with cross-platform support
async function runTypeScriptDiagnostics() {
  return new Promise(async (resolve) => {
    const results = [];
    const tsconfigPath = path.join(extensionDir, 'tsconfig.json');

    if (!fs.existsSync(tsconfigPath)) {
      console.error(`[Real Diagnostics] No tsconfig.json found at ${tsconfigPath}, skipping TypeScript diagnostics`);
      resolve([]);
      return;
    }

    // ✅ Check if TypeScript is available using cross-platform command detection
    const tscCommand = CrossPlatform.getCommandForPlatform('npx');
    const hasTypeScript = await CrossPlatform.commandExists('tsc');
    if (!hasTypeScript) {
      console.error('[Real Diagnostics] TypeScript not found, skipping diagnostics');
      resolve([]);
      return;
    }

    console.error('[Real Diagnostics] Running TypeScript diagnostics with cross-platform support...');

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
      console.error(`[Real Diagnostics] TypeScript analysis complete: ${results.length} problems found`);
      resolve(results);
    });

    tsc.on('error', (error) => {
      console.error('[Real Diagnostics] TypeScript error:', error);
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
      console.error(`[Real Diagnostics] No ESLint config found in ${extensionDir}, skipping ESLint diagnostics`);
      resolve([]);
      return;
    }

    // ✅ Check if ESLint is available using cross-platform command detection
    const eslintCommand = CrossPlatform.getCommandForPlatform('npx');
    const hasESLint = await CrossPlatform.commandExists('eslint');
    if (!hasESLint) {
      console.error('[Real Diagnostics] ESLint not found, skipping diagnostics');
      resolve([]);
      return;
    }

    console.error('[Real Diagnostics] Running ESLint diagnostics with cross-platform support...');

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
          console.error('[Real Diagnostics] Error parsing ESLint output:', error);
        }
      }
      console.error(`[Real Diagnostics] ESLint analysis complete: ${results.length} problems found`);
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
        console.error(`[Real Diagnostics] Loaded ${data.problemCount || 0} VS Code problems from export (${Math.round(age/1000)}s old)`);
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

  refreshPromise = (async () => {
    try {
      console.error('[Real Diagnostics] Refreshing diagnostic cache...');
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
        console.error(`[Real Diagnostics] Using ${vsCodeProblems.length} problems from VS Code export`);
      } else {
        // Fall back to static analysis
        console.error('[Real Diagnostics] Running static analysis fallback...');

        const [typeScriptProblems, eslintProblems] = await Promise.all([
          runTypeScriptDiagnostics(),
          runESLintDiagnostics()
        ]);

        const allProblems = [...typeScriptProblems, ...eslintProblems];

        for (const problem of allProblems) {
          const key = `${problem.filePath}:${problem.range.start.line}:${problem.range.start.character}`;
          diagnosticsCache.set(key, problem);
        }

        console.error(`[Real Diagnostics] Static analysis complete: ${typeScriptProblems.length} TypeScript + ${eslintProblems.length} ESLint = ${allProblems.length} total problems`);
      }

      lastRefresh = Date.now();
      const duration = lastRefresh - startTime;
      console.error(`[Real Diagnostics] Cache refresh completed in ${duration}ms`);

    } catch (error) {
      console.error('[Real Diagnostics] Error refreshing diagnostics:', error);
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

// ✅ PHASE 4.2: Platform detection and logging with cross-platform info
console.error(`[System Info] Running on ${process.platform} (${process.arch})`);
console.error(`[System Info] Node.js ${process.version}`);
console.error(`[System Info] Extension directory: ${extensionDir}`);
console.error(`[Cross-Platform] Windows: ${CrossPlatform.isWindows()}`);
console.error(`[Cross-Platform] macOS: ${CrossPlatform.isMac()}`);
console.error(`[Cross-Platform] Linux: ${CrossPlatform.isLinux()}`);
if (CrossPlatformUtils) {
  console.error(`[Cross-Platform] Using compiled CrossPlatformUtils`);
} else {
  console.error(`[Cross-Platform] Using fallback cross-platform implementation`);
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
      console.error('[MCP Server] Starting cross-platform VS Code Diagnostics MCP server...');
      await refreshDiagnostics();
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error('[MCP Server] ✅ Server started');
    } catch (error) {
      console.error('[MCP Server] ❌ Failed to start server:', error);
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
