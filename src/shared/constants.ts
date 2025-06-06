import { z } from 'zod';
import { ProblemSeverity } from './types';

/**
 * Default configuration values for the extension
 *
 * These values provide sensible defaults for all configurable aspects
 * of the extension, optimized for performance and usability.
 */
export const DEFAULT_CONFIG = {
  /** Port for the MCP server */
  mcpServerPort: 6070,
  /** Debounce interval for diagnostic change events (ms) */
  debounceMs: 300,
  /** Enable performance logging and monitoring */
  enablePerformanceLogging: false,
  /** Maximum number of problems to track per file */
  maxProblemsPerFile: 1000,
  /** Enable debug logging for troubleshooting */
  enableDebugLogging: false,
} as const;

/**
 * Performance thresholds for monitoring extension health
 *
 * These thresholds help identify performance issues and trigger
 * warnings when operations exceed acceptable limits.
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Maximum time for processing diagnostic changes (ms) */
  diagnosticProcessingMs: 500,
  /** Maximum time for MCP tool responses (ms) */
  mcpResponseMs: 100,
  /** Maximum time for extension activation (ms) */
  extensionActivationMs: 2000,
  /** Maximum memory usage before warning (MB) */
  memoryUsageMb: 100,
} as const;

/**
 * Error codes for structured error handling
 *
 * These codes provide consistent error identification across
 * the extension for logging, debugging, and error reporting.
 */
export const ERROR_CODES = {
  /** MCP server failed to start or crashed */
  MCP_SERVER_FAILED: 'MCP_SERVER_FAILED',
  /** DiagnosticsWatcher encountered an error */
  DIAGNOSTICS_WATCHER_FAILED: 'DIAGNOSTICS_WATCHER_FAILED',
  /** Configuration validation failed */
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  /** VS Code API call failed */
  VSCODE_API_ERROR: 'VSCODE_API_ERROR',
  /** Performance threshold exceeded */
  PERFORMANCE_THRESHOLD_EXCEEDED: 'PERFORMANCE_THRESHOLD_EXCEEDED',
} as const;

/**
 * Event names for internal communication
 *
 * Standardized event names used throughout the extension
 * for consistent event-driven communication.
 */
export const EVENT_NAMES = {
  /** Emitted when problems change for any file */
  PROBLEMS_CHANGED: 'problemsChanged',
  /** Emitted when the watcher encounters an error */
  WATCHER_ERROR: 'watcherError',
  /** Emitted when performance thresholds are exceeded */
  PERFORMANCE_WARNING: 'performanceWarning',
  /** Emitted when an MCP client connects */
  MCP_CLIENT_CONNECTED: 'mcpClientConnected',
  /** Emitted when an MCP client disconnects */
  MCP_CLIENT_DISCONNECTED: 'mcpClientDisconnected',
} as const;

/**
 * MCP server metadata and capabilities
 *
 * Information about the MCP server that will be exposed
 * to connecting clients.
 */
export const MCP_SERVER_INFO = {
  /** Server name identifier */
  name: 'vscode-diagnostics-server',
  /** Server version */
  version: '1.0.0',
  /** Human-readable description */
  description: 'VS Code diagnostics exposed via MCP',
  /** Server capabilities */
  capabilities: {
    tools: {},
    resources: {},
    notifications: {},
  },
} as const;

/**
 * Mapping from VS Code DiagnosticSeverity enum values to our ProblemSeverity strings
 *
 * VS Code uses numeric enum values (0-3) for severity levels.
 * This map converts them to our string-based severity system.
 *
 * @see https://code.visualstudio.com/api/references/vscode-api#DiagnosticSeverity
 */
export const VSCODE_SEVERITY_MAP: Record<number, ProblemSeverity> = {
  0: 'Error', // DiagnosticSeverity.Error
  1: 'Warning', // DiagnosticSeverity.Warning
  2: 'Information', // DiagnosticSeverity.Information
  3: 'Hint', // DiagnosticSeverity.Hint
} as const;

/**
 * MCP tool definitions with schemas
 *
 * Defines all the tools that will be exposed via the MCP server,
 * including their names, descriptions, and input validation schemas.
 */
export const MCP_TOOLS = {
  GET_PROBLEMS: {
    name: 'getProblems',
    description: 'Get all current problems/diagnostics from VS Code',
    inputSchema: {
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          enum: ['Error', 'Warning', 'Information', 'Hint'],
          description: 'Filter by problem severity',
        },
        workspaceFolder: {
          type: 'string',
          description: 'Filter by workspace folder name',
        },
        filePath: {
          type: 'string',
          description: 'Filter by specific file path',
        },
        source: {
          type: 'string',
          description: 'Filter by diagnostic source (e.g., typescript, eslint)',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 10000,
          description: 'Maximum number of problems to return',
        },
        offset: {
          type: 'number',
          minimum: 0,
          description: 'Number of problems to skip (for pagination)',
        },
      },
      additionalProperties: false,
    },
  },
  GET_PROBLEMS_FOR_FILE: {
    name: 'getProblemsForFile',
    description: 'Get problems for a specific file',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the file',
        },
      },
      required: ['filePath'],
      additionalProperties: false,
    },
  },
  GET_WORKSPACE_SUMMARY: {
    name: 'getWorkspaceSummary',
    description: 'Get summary statistics of problems across workspace',
    inputSchema: {
      type: 'object',
      properties: {
        groupBy: {
          type: 'string',
          enum: ['severity', 'source', 'workspaceFolder'],
          description: 'How to group the summary statistics',
        },
      },
      additionalProperties: false,
    },
  },
  GET_PERFORMANCE_METRICS: {
    name: 'getPerformanceMetrics',
    description: 'Get performance metrics and health information',
    inputSchema: {
      type: 'object',
      properties: {
        includeHistory: {
          type: 'boolean',
          description: 'Include historical performance data',
        },
      },
      additionalProperties: false,
    },
  },
} as const;

/**
 * Zod schema for extension configuration validation
 *
 * Validates configuration objects to ensure they contain valid values
 * for all extension settings.
 */
export const ExtensionConfigSchema = z.object({
  mcpServerPort: z.number().int().min(1024).max(65535),
  debounceMs: z.number().int().min(0).max(5000),
  enablePerformanceLogging: z.boolean(),
  maxProblemsPerFile: z.number().int().min(1).max(100000),
  enableDebugLogging: z.boolean(),
});

/**
 * Type for extension configuration
 * Inferred from the Zod schema to ensure consistency
 */
export type ExtensionConfig = z.infer<typeof ExtensionConfigSchema>;

/**
 * Validates extension configuration with helpful error messages
 *
 * @param config - Configuration object to validate
 * @returns Validated configuration object
 * @throws ZodError with detailed validation errors
 *
 * @example
 * ```typescript
 * const config = validateExtensionConfig({
 *   mcpServerPort: 6070,
 *   debounceMs: 300,
 *   enablePerformanceLogging: false,
 *   maxProblemsPerFile: 1000,
 *   enableDebugLogging: false,
 * });
 * ```
 */
export function validateExtensionConfig(config: unknown): ExtensionConfig {
  // Merge with defaults for partial configurations
  const configWithDefaults = {
    ...DEFAULT_CONFIG,
    ...(typeof config === 'object' && config !== null ? config : {}),
  };

  return ExtensionConfigSchema.parse(configWithDefaults);
}
