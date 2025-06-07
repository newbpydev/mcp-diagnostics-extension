# Shared Components 🔗

This directory contains common types, constants, and utilities that are shared across all layers of the MCP Diagnostics Extension. These components form the **foundation** of our type-safe, well-structured codebase.

## 📋 Overview

The shared layer provides:
- **Type Definitions** - Common interfaces and type aliases
- **Constants** - Configuration values and enums
- **Utility Functions** - Helper functions used throughout the extension
- **Cross-cutting Concerns** - Shared logic that doesn't belong to specific layers

## 📁 Directory Structure

```
shared/
├── types.ts        # Core type definitions and interfaces
├── constants.ts    # Configuration constants and enums
└── index.ts        # Barrel export for clean imports
```

## 🎯 Core Components

### types.ts
**Primary responsibility**: Type definitions for the entire extension

#### Key Types

##### ProblemItem
The canonical representation of a diagnostic problem:
```typescript
interface ProblemItem {
  filePath: string;           // Absolute file path
  workspaceFolder: string;    // Workspace name/path
  range: {                    // Position in file
    start: { line: number; character: number; };
    end: { line: number; character: number; };
  };
  severity: ProblemSeverity;  // Error, Warning, Information, Hint
  message: string;            // Human-readable description
  source: string;             // Source of diagnostic (ESLint, TypeScript, etc.)
  code?: string | number;     // Optional error code
}
```

##### ProblemSeverity
Standardized severity levels:
```typescript
type ProblemSeverity = 'Error' | 'Warning' | 'Information' | 'Hint';
```

##### Configuration Types
Extension configuration interfaces:
```typescript
interface McpDiagnosticsConfig {
  server: {
    port: number;
    enabled: boolean;
  };
  diagnostics: {
    debounceMs: number;
    maxProblems: number;
  };
  debug: {
    enabled: boolean;
    logLevel: LogLevel;
  };
}
```

##### MCP Protocol Types
Types for MCP tool arguments and responses:
```typescript
interface GetProblemsArgs {
  filePath?: string;
  severity?: ProblemSeverity;
  workspaceFolder?: string;
  limit?: number;
  offset?: number;
}

interface ProblemsResponse {
  problems: ProblemItem[];
  total: number;
  hasMore: boolean;
}
```

### constants.ts
**Primary responsibility**: Centralized configuration and constant values

#### Configuration Categories

##### Default Settings
```typescript
export const DEFAULT_CONFIG = {
  SERVER_PORT: 6070,
  DEBOUNCE_MS: 300,
  MAX_PROBLEMS_PER_FILE: 1000,
  PERFORMANCE_LOGGING: false,
  DEBUG_LOGGING: false,
} as const;
```

##### Performance Thresholds
```typescript
export const PERFORMANCE_THRESHOLDS = {
  DIAGNOSTIC_PROCESSING_MS: 500,
  MCP_TOOL_RESPONSE_MS: 100,
  STATUS_BAR_UPDATE_MS: 50,
  MEMORY_USAGE_MB: 100,
} as const;
```

##### MCP Tool Names
```typescript
export const MCP_TOOLS = {
  GET_PROBLEMS: 'getProblems',
  GET_PROBLEMS_FOR_FILE: 'getProblemsForFile',
  GET_WORKSPACE_SUMMARY: 'getWorkspaceSummary',
} as const;
```

##### VS Code Integration
```typescript
export const VSCODE_COMMANDS = {
  RESTART_SERVER: 'mcpDiagnostics.restart',
  SHOW_STATUS: 'mcpDiagnostics.showStatus',
} as const;

export const STATUS_BAR_CONFIG = {
  ALIGNMENT: 'Right',
  PRIORITY: 100,
  ICONS: {
    NORMAL: '$(bug)',
    LOADING: '$(sync~spin)',
    ERROR: '$(error)',
  },
} as const;
```

### index.ts
**Primary responsibility**: Barrel exports for clean imports

```typescript
// Re-export all types and constants
export * from './types';
export * from './constants';

// Convenience exports for commonly used items
export type {
  ProblemItem,
  ProblemSeverity,
  McpDiagnosticsConfig,
} from './types';

export {
  DEFAULT_CONFIG,
  MCP_TOOLS,
  VSCODE_COMMANDS,
} from './constants';
```

## 🔄 Usage Patterns

### Clean Imports
```typescript
// Instead of relative imports
import { ProblemItem } from '../../shared/types';
import { DEFAULT_CONFIG } from '../../shared/constants';

// Use barrel exports
import { ProblemItem, DEFAULT_CONFIG } from '@shared';
```

### Type Guards
```typescript
// Type safety helpers
export function isProblemItem(obj: unknown): obj is ProblemItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'filePath' in obj &&
    'severity' in obj &&
    'message' in obj
  );
}

export function isValidSeverity(value: string): value is ProblemSeverity {
  return ['Error', 'Warning', 'Information', 'Hint'].includes(value);
}
```

### Configuration Helpers
```typescript
// Configuration access utilities
export function getConfigValue<T>(
  key: keyof McpDiagnosticsConfig,
  defaultValue: T
): T {
  return vscode.workspace
    .getConfiguration('mcpDiagnostics')
    .get(key, defaultValue);
}
```

## 🧪 Testing Strategy

### Type Testing
```typescript
describe('Types', () => {
  it('should validate ProblemItem structure', () => {
    const problem: ProblemItem = {
      filePath: '/test/file.ts',
      workspaceFolder: 'test-workspace',
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
      severity: 'Error',
      message: 'Test error',
      source: 'TypeScript',
    };

    expect(isProblemItem(problem)).toBe(true);
  });
});
```

### Constants Testing
```typescript
describe('Constants', () => {
  it('should have valid default configuration', () => {
    expect(DEFAULT_CONFIG.SERVER_PORT).toBeGreaterThan(1024);
    expect(DEFAULT_CONFIG.DEBOUNCE_MS).toBeGreaterThan(0);
  });
});
```

## 📈 Design Principles

### Type Safety First
- **Strict Types** - No `any` types allowed
- **Runtime Validation** - Type guards for external data
- **Compile-time Checks** - Leverage TypeScript's type system

### Immutability
- **Readonly Objects** - Use `as const` for configuration
- **Immutable Interfaces** - Readonly properties where appropriate
- **Functional Approach** - Pure functions for utilities

### Discoverability
- **Barrel Exports** - Single import point for related items
- **Descriptive Names** - Clear, self-documenting identifiers
- **Grouped Constants** - Logical organization of related values

## 🔧 Extension Guidelines

### Adding New Types
1. Define in `types.ts` with full JSDoc documentation
2. Add type guards if needed for runtime validation
3. Export through `index.ts` barrel
4. Add unit tests for complex types

### Adding New Constants
1. Group related constants in objects
2. Use `as const` for immutability
3. Follow naming conventions (SCREAMING_SNAKE_CASE)
4. Document purpose and usage

### Utility Functions
1. Keep functions pure (no side effects)
2. Add comprehensive type annotations
3. Include JSDoc with examples
4. Write unit tests for all utilities

## 📊 Quality Metrics

- **Type Coverage**: 100% (no `any` types)
- **Test Coverage**: >95% for utility functions
- **Documentation**: JSDoc for all public interfaces
- **Consistency**: Standardized naming conventions

## 🔍 Common Patterns

### Configuration Access
```typescript
// Centralized configuration reading
const config = getConfigValue('server.port', DEFAULT_CONFIG.SERVER_PORT);
```

### Type-safe Enums
```typescript
// Use const assertions for type-safe enums
const SEVERITY_LEVELS = ['Error', 'Warning', 'Information', 'Hint'] as const;
type ProblemSeverity = typeof SEVERITY_LEVELS[number];
```

### Branded Types
```typescript
// Create distinct types for similar data
type FilePath = string & { readonly brand: unique symbol };
type WorkspaceName = string & { readonly brand: unique symbol };
```

---

*The shared layer ensures consistency, type safety, and maintainability across the entire extension codebase.*
