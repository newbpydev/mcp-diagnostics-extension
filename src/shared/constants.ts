import { ExtensionConfig } from './types';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ExtensionConfig = {
  mcpServerPort: 6070,
  debounceMs: 300,
  enablePerformanceLogging: false,
  maxProblemsPerFile: 1000,
} as const;

/**
 * MCP server information
 */
export const MCP_SERVER_INFO = {
  name: 'vscode-diagnostics-server',
  version: '1.0.0',
  description: 'Exposes VS Code diagnostics via MCP protocol',
} as const;

/**
 * Performance monitoring constants
 */
export const PERFORMANCE_THRESHOLDS = {
  diagnosticProcessingMs: 500,
  mcpResponseMs: 100,
  extensionActivationMs: 2000,
} as const;

/**
 * Error codes for the extension
 */
export const ERROR_CODES = {
  MCP_SERVER_FAILED: 'MCP_SERVER_FAILED',
  DIAGNOSTICS_WATCHER_FAILED: 'DIAGNOSTICS_WATCHER_FAILED',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
} as const;

/**
 * VS Code diagnostic severity mapping
 */
export const VSCODE_SEVERITY_MAP = {
  0: 'Error',
  1: 'Warning',
  2: 'Information',
  3: 'Hint',
} as const;

/**
 * MCP tool names
 */
export const MCP_TOOLS = {
  GET_PROBLEMS: 'getProblems',
  GET_PROBLEMS_FOR_FILE: 'getProblemsForFile',
  GET_WORKSPACE_SUMMARY: 'getWorkspaceSummary',
  GET_PROBLEM_SUMMARY: 'getProblemSummary',
} as const;

/**
 * MCP resource URIs
 */
export const MCP_RESOURCES = {
  WORKSPACE_SUMMARY: 'diagnostics://workspace/summary',
  FILES_WITH_PROBLEMS: 'diagnostics://workspace/files',
  PROBLEM_STATISTICS: 'diagnostics://workspace/statistics',
} as const;
