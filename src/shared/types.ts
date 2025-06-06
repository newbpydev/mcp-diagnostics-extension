/**
 * Severity levels for diagnostic problems
 */
export type ProblemSeverity = 'Error' | 'Warning' | 'Information' | 'Hint';

/**
 * Position in a document
 */
export interface Position {
  readonly line: number;
  readonly character: number;
}

/**
 * Range in a document
 */
export interface Range {
  readonly start: Position;
  readonly end: Position;
}

/**
 * Core problem item model - this is our canonical representation
 * of a diagnostic issue that will be exposed via MCP
 */
export interface ProblemItem {
  readonly filePath: string;
  readonly workspaceFolder: string;
  readonly range: Range;
  readonly severity: ProblemSeverity;
  readonly message: string;
  readonly source: string;
  readonly code?: string | number;
  readonly relatedInformation?: ReadonlyArray<{
    location: {
      uri: string;
      range: Range;
    };
    message: string;
  }>;
}

/**
 * Event emitted when diagnostics change
 */
export interface DiagnosticsChangeEvent {
  readonly uri: string;
  readonly problems: ReadonlyArray<ProblemItem>;
}

/**
 * Configuration for the extension
 */
export interface ExtensionConfig {
  readonly mcpServerPort: number;
  readonly debounceMs: number;
  readonly enablePerformanceLogging: boolean;
  readonly maxProblemsPerFile: number;
}

/**
 * Filter options for querying problems
 */
export interface ProblemFilter {
  readonly severity?: ProblemSeverity;
  readonly workspaceFolder?: string;
  readonly filePath?: string;
  readonly source?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Summary statistics for problems
 */
export interface ProblemSummary {
  readonly totalProblems: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly hintCount: number;
  readonly fileCount: number;
  readonly workspaceFolders: ReadonlyArray<string>;
}
